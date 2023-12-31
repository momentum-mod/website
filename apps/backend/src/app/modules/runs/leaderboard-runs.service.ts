import {
  BadRequestException,
  forwardRef,
  ImATeapotException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SteamService } from '../steam/steam.service';
import {
  DtoFactory,
  MapLeaderboardGetQueryDto,
  MapLeaderboardGetRunQueryDto,
  PagedResponseDto,
  LeaderboardRunDto,
  MinimalLeaderboardRunDto
} from '../../dto';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { MapsService } from '../maps/maps.service';
import { FileStoreService } from '../filestore/file-store.service';
import { runPath } from '@momentum/constants';

@Injectable()
export class LeaderboardRunsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    @Inject(forwardRef(() => MapsService))
    private readonly mapsService: MapsService,
    private readonly fileStoreService: FileStoreService,
    private readonly steamService: SteamService
  ) {}

  private readonly minimalRunsSelect: Prisma.LeaderboardRunSelect = {
    userID: true,
    rank: true,
    rankXP: true,
    replayHash: true,
    time: true,
    flags: true,
    createdAt: true,
    pastRunID: true,
    user: true // We always include user, query is pretty pointless without
  };

  private readonly runsSelect: Prisma.LeaderboardRunSelect = {
    ...this.minimalRunsSelect,
    mapID: true,
    gamemode: true,
    trackType: true,
    trackNum: true,
    style: true
  };

  async getRuns(
    mapID: number,
    query: MapLeaderboardGetQueryDto,
    loggedInUserID: number,
    loggedInUserSteamID: bigint
  ): Promise<PagedResponseDto<MinimalLeaderboardRunDto>> {
    // TODO: Doing this check is an extra query, for an endpoint we care greatly
    // about optimising. May be worth trying to speed up in the future.
    await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID: loggedInUserID
    });

    const where: Prisma.LeaderboardRunWhereInput = {
      mapID,
      gamemode: query.gamemode,
      trackType: query.trackType,
      trackNum: query.trackNum,
      style: query.style
    };

    const select = {
      ...this.minimalRunsSelect,
      stats: Boolean(query.expand)
    };

    const orderBy: Prisma.LeaderboardRunOrderByWithAggregationInput =
      query.orderByDate === true ? { createdAt: 'desc' } : { rank: 'asc' };

    let skip = query.skip;
    let take = query.take;

    if (query.filter?.length > 1) throw new BadRequestException();
    // Potentially a faster way of doing this in one query in raw SQL, something
    // to investigate when we move to that/query builder.
    if (query.filter?.[0] === 'around') {
      const userRun = await this.db.leaderboardRun.findUnique({
        where: {
          userID_gamemode_style_mapID_trackType_trackNum: {
            mapID,
            userID: loggedInUserID,
            gamemode: query.gamemode,
            trackType: query.trackType,
            trackNum: query.trackNum,
            style: query.style
          }
        }
      });

      if (!userRun)
        throw new NotFoundException('User has no runs on this leaderboard');

      // Start at your rank, then backtrack by half of `take`, then 1 for your rank
      skip = Math.max(userRun.rank - Math.floor(take / 2) - 1, 0);
      // We include your rank, so increment `take` by 1.
      take = take + 1;
    } else if (query.filter?.[0] === 'friends') {
      // Regular skip/take should work fine here.

      const steamFriends =
        await this.steamService.getSteamFriends(loggedInUserSteamID);

      if (steamFriends.length === 0)
        throw new ImATeapotException('No friends detected :(');

      // Doing this with a window function is gonna be fun...
      where.user = {
        steamID: { in: steamFriends.map((item) => BigInt(item.steamid)) }
      };
    }

    const dbResponse = await this.db.leaderboardRun.findManyAndCount({
      where,
      select,
      orderBy,
      skip,
      take
    });

    // Important note: If there's no items in the response, it's possible the
    // leaderboard just doesn't exist. However we'd need to do a separate query
    // to check, just so we can send the correct error to the client (which
    // is presumably misconfigured in some way). This would be a (minor) perf
    // hit for new maps with no runs yet - not something we should do just to
    // show the right error message. Have left a note in the Swagger docs.

    return new PagedResponseDto(MinimalLeaderboardRunDto, dbResponse);
  }

  async getRun(
    mapID: number,
    query: MapLeaderboardGetRunQueryDto,
    loggedInUserID: number
  ): Promise<LeaderboardRunDto> {
    const where: Prisma.LeaderboardRunWhereInput = {
      mapID,
      gamemode: query.gamemode,
      trackType: query.trackType,
      trackNum: query.trackNum,
      style: query.style
    };

    if (query.rank) {
      if (query.userID) {
        throw new BadRequestException(
          "Cannot include both 'rank' and 'userID'"
        );
      }

      where.rank = query.rank;
    } else if (query.userID) {
      where.userID = query.userID;
    } else {
      throw new BadRequestException("Must include 'rank' or 'userID' param");
    }

    await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID: loggedInUserID
    });

    const select = {
      ...this.runsSelect,
      stats: Boolean(query.expand)
    };

    const dbResponse = await this.db.leaderboardRun.findFirst({
      where,
      select
    });

    if (!dbResponse) throw new NotFoundException('Run not found');

    return DtoFactory(LeaderboardRunDto, dbResponse);
  }

  async deleteStoredMapRuns(mapID: number): Promise<void> {
    const runs = await this.db.leaderboardRun.findMany({ where: { mapID } });

    await Promise.all(
      runs.map((run) =>
        this.fileStoreService.deleteFile(runPath(run.replayHash))
      )
    );
  }
}
