import {
  BadRequestException,
  forwardRef,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { runPath } from '@momentum/constants';
import { SteamService } from '../steam/steam.service';
import {
  DtoFactory,
  MapCompletionDto,
  MapCompletionsGetQueryDto,
  MapLeaderboardGetQueryDto,
  MapLeaderboardGetRunQueryDto,
  PagedResponseDto,
  LeaderboardRunDto
} from '../../dto';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { MapsService } from '../maps/maps.service';
import { FileStoreService } from '../filestore/file-store.service';
import { LeaderboardRunsDbService } from './leaderboard-runs-db.service';

@Injectable()
export class LeaderboardRunsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    @Inject(forwardRef(() => MapsService))
    private readonly mapsService: MapsService,
    private readonly leaderboardRunsDbService: LeaderboardRunsDbService,
    private readonly fileStoreService: FileStoreService,
    private readonly steamService: SteamService
  ) {}

  async getRuns(
    mapID: number,
    query: MapLeaderboardGetQueryDto,
    loggedInUserID?: number,
    loggedInUserSteamID?: bigint
  ): Promise<PagedResponseDto<LeaderboardRunDto>> {
    // TODO: Doing this check is an extra query, for an endpoint we care greatly
    // about optimising. May be worth trying to speed up in the future.
    await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID: loggedInUserID
    });

    if (
      [query.userIDs, query.steamIDs, query.filter?.[0]].filter(Boolean)
        .length > 1
    ) {
      throw new BadRequestException(
        'Only one of userIDs, steamIDs or filter may be included'
      );
    }

    let dbCall: Promise<any>;
    let steamIDs = query.steamIDs?.map(BigInt);

    const filter = query.filter?.[0];
    if (filter) {
      if (!loggedInUserID) {
        throw new UnauthorizedException();
      }

      // Not really a filter; just a way to jump to the part of the leaderboard
      // your run is at.
      if (filter === 'around') {
        const rank = await this.leaderboardRunsDbService.getUserRank({
          mapID,
          gamemode: query.gamemode,
          trackType: query.trackType,
          trackNum: query.trackNum,
          style: query.style,
          userID: loggedInUserID
        });

        if (!rank) {
          throw new GoneException('User has no runs on this leaderboard');
        }

        // Return the page-aligned window of `take` runs that contains the
        // user's PB, using the same fixed page size the client paginates with.
        // The client derives which page this is from its own row in the
        // response (rank -> floor((rank - 1) / take)).
        const page = Math.floor((rank - 1) / query.take);
        const skip = page * query.take;
        const take = query.take;

        dbCall = this.leaderboardRunsDbService.getRankedRuns({
          mapID,
          gamemode: query.gamemode,
          trackType: query.trackType,
          trackNum: query.trackNum,
          style: query.style,
          skip,
          take
        });
      } else if (filter === 'friends') {
        // TODO: We've been requested to include LIU in this:
        // https://github.com/momentum-mod/game/issues/2588

        // Fetch Steam friends, leave errors uncaught, this function will throw
        // an appropriate response.
        const steamFriends =
          await this.steamService.getSteamFriends(loggedInUserSteamID);

        if (steamFriends.length === 0)
          throw new GoneException('No friends detected :(');

        steamIDs = steamFriends.map((item) => BigInt(item.steamid));

        // Always add the local player to the list, client handles the case where it's the only record returned
        if (loggedInUserSteamID) {
          steamIDs.push(loggedInUserSteamID);
        }

        dbCall = this.leaderboardRunsDbService.getRankedRuns({
          mapID,
          ...query,
          steamIDs
        });
      }
    } else {
      dbCall = this.leaderboardRunsDbService.getRankedRuns({
        mapID,
        ...query,
        steamIDs
      });
    }

    // Important note: If there's no items in the response, it's possible the
    // leaderboard just doesn't exist. However we'd need to do a separate query
    // to check, just so we can send the correct error to the client (which
    // is presumably misconfigured in some way). This would be a (minor) perf
    // hit for new maps with no runs yet - not something we should do just to
    // show the right error message. Have left a note in the Swagger docs.
    return new PagedResponseDto(
      LeaderboardRunDto,
      await Promise.all([
        dbCall,
        this.db.leaderboardRun.count({
          where: {
            mapID: mapID,
            gamemode: query.gamemode,
            trackType: query.trackType,
            trackNum: query.trackNum,
            style: query.style,
            ...(steamIDs && { user: { steamID: { in: steamIDs } } }),
            ...(query.userIDs && { userID: { in: query.userIDs } })
          }
        })
      ])
    );
  }

  async getRun(
    mapID: number,
    query: MapLeaderboardGetRunQueryDto,
    loggedInUserID?: number
  ): Promise<LeaderboardRunDto> {
    await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID: loggedInUserID
    });

    if (query.rank) {
      if (query.userID) {
        throw new BadRequestException(
          "Cannot include both 'rank' and 'userID'"
        );
      }

      const dbResponse = await this.leaderboardRunsDbService.getRankedRuns({
        mapID,
        gamemode: query.gamemode,
        trackType: query.trackType,
        trackNum: query.trackNum,
        style: query.style,
        skip: query.rank - 1,
        take: 1,
        includeSplits: query.expand === 'splits'
      });

      if (dbResponse?.[0]) {
        return DtoFactory(LeaderboardRunDto, dbResponse[0]);
      }
    } else if (query.userID) {
      const dbResponse = await this.leaderboardRunsDbService.getRankedRuns({
        mapID,
        gamemode: query.gamemode,
        trackType: query.trackType,
        trackNum: query.trackNum,
        style: query.style,
        userIDs: [query.userID],
        includeSplits: query.expand === 'splits'
      });

      if (dbResponse?.[0]) {
        return DtoFactory(LeaderboardRunDto, dbResponse[0]);
      }
    } else {
      throw new BadRequestException("Must include 'rank' or 'userID' param");
    }

    throw new NotFoundException('Run not found');
  }

  /**
   * Returns the logged-in user's completion status for every track on a map, in
   * a single gamemode + style. One entry per leaderboard (track), whether or not
   * the user has completed it. The game merges this with its map cache (track
   * labels, tiers, and the PB time) to build the map selector's completion table.
   *
   * Note: tier, the PB time, and the completion group are not returned here. The
   * game sources tier and PB time from its map cache (tier because Leaderboard.tier
   * is null for submission maps; PB time because it only changes when the user
   * submits a run, so it's cached per track/style from GetMap). The completion group
   * is derived on the front end from rank + totalCompletions.
   */
  async getMapUserCompletions(
    mapID: number,
    query: MapCompletionsGetQueryDto,
    loggedInUserID: number
  ): Promise<MapCompletionDto[]> {
    await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID: loggedInUserID
    });

    const rows = await this.leaderboardRunsDbService.getMapUserCompletions({
      mapID,
      gamemode: query.gamemode,
      style: query.style,
      userID: loggedInUserID
    });

    return rows.map((row) =>
      DtoFactory(MapCompletionDto, {
        trackType: row.trackType,
        trackNum: row.trackNum,
        totalCompletions: row.totalCompletions ?? 0,
        rank: row.rank
      })
    );
  }

  async deleteStoredMapRuns(mapID: number): Promise<void> {
    const runs = await this.db.leaderboardRun.findMany({
      where: { mapID }
    });

    await Promise.all(
      runs.map((run) =>
        this.fileStoreService.deleteFile(runPath(run.replayHash))
      )
    );
  }
}
