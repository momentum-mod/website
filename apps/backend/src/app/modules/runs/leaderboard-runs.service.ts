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
  MapLeaderboardGetQueryDto,
  MapLeaderboardGetRunQueryDto,
  PagedResponseDto,
  LeaderboardRunDto,
  UsersGetRunsQueryDto
} from '../../dto';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { MapsService } from '../maps/maps.service';
import { FileStoreService } from '../filestore/file-store.service';
import { LeaderboardRunsDbService } from './leaderboard-runs-db.service';
import { RankingService } from '../ranking/ranking.service';
import { XpSystemsService } from '../xp-systems/xp-systems.service';

@Injectable()
export class LeaderboardRunsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    @Inject(forwardRef(() => MapsService))
    private readonly mapsService: MapsService,
    private readonly leaderboardRunsDbService: LeaderboardRunsDbService,
    private readonly fileStoreService: FileStoreService,
    private readonly steamService: SteamService,
    private readonly rankingService: RankingService,
    private readonly xpSystems: XpSystemsService
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
      [query.userIDs, query.steamIDs, query.filter].filter(Boolean).length > 1
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

        // Start at your rank, then backtrack by half of `take`, then 1 for your rank
        const skip = Math.max(rank - Math.floor(query.take / 2) - 1, 0);
        // We include your rank, so increment `take` by 1.
        const take = query.take + 1;

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

  async getUsersRuns(
    userID: number,
    query: UsersGetRunsQueryDto
  ): Promise<PagedResponseDto<LeaderboardRunDto>> {
    const where: any = { userID };

    if (query.gamemode != null) {
      where.gamemode = query.gamemode;
    }

    if (query.trackType != null) {
      where.trackType = query.trackType;
    }

    if (query.trackNum != null) {
      where.trackNum = query.trackNum;
    }

    if (query.style != null) {
      where.style = query.style;
    }

    if (query.leaderboardType != null) {
      where.leaderboard = { type: query.leaderboardType };
    }

    if (query.mapStatus != null) {
      where.mmap = { status: query.mapStatus };
    }

    // TODO: try add createdat to index?
    const leaderboards = await this.db.leaderboardRun.findManyAndCount({
      where,
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take,
      include: {
        mmap: true,
        leaderboard: true
      },
      omit: {
        splits: true
      }
    });

    for (const run of leaderboards[0]) {
      const rank = await this.leaderboardRunsDbService.getUserRank({
        mapID: run.mapID,
        gamemode: run.gamemode,
        trackType: run.trackType,
        trackNum: run.trackNum,
        style: run.style,
        userID
      });

      // TODO: No, use zcard in redis. Also rio might've been storing directly
      // even, don't rememember.
      // Prisma generates decent query for this with index-only scan
      const totalRuns = await this.db.leaderboardRun.count({
        where: {
          mapID: run.mapID,
          gamemode: run.gamemode,
          trackType: run.trackType,
          trackNum: run.trackNum,
          style: run.style
        }
      });

      const points = this.xpSystems.getRankXpForRank(rank, totalRuns);

      Object.assign(run as any, { rank, totalRuns, points });
    }

    const points = await this.rankingService.getUserPointsForRuns(
      userID,
      leaderboards[0]
    );

    for (let i = 0; i < leaderboards[0].length; i++) {
      (leaderboards[0][i] as any).points = points[i];
    }

    return new PagedResponseDto(LeaderboardRunDto, leaderboards);
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
