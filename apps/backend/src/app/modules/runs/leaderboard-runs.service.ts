import {
  BadRequestException,
  forwardRef,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { runPath } from '@momentum/constants';
import { SteamService } from '../steam/steam.service';
import {
  DtoFactory,
  MapLeaderboardGetQueryDto,
  MapLeaderboardGetRunQueryDto,
  PagedResponseDto,
  LeaderboardRunDto
} from '../../dto';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { MapsService } from '../maps/maps.service';
import { FileStoreService } from '../filestore/file-store.service';

@Injectable()
export class LeaderboardRunsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    @Inject(forwardRef(() => MapsService))
    private readonly mapsService: MapsService,
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

    const where: Prisma.LeaderboardRunWhereInput = {
      mapID,
      gamemode: query.gamemode,
      trackType: query.trackType,
      trackNum: query.trackNum,
      style: query.style
    };

    if (query.userIDs) {
      where.userID = { in: query.userIDs };
    }

    if (query.steamIDs) {
      where.user = { steamID: { in: query.steamIDs.map(BigInt) } };
    }

    const omit: Prisma.LeaderboardRunOmit | undefined = query.expand
      ? undefined
      : { splits: true };

    const orderBy: Prisma.LeaderboardRunOrderByWithAggregationInput =
      query.orderByDate === true ? { createdAt: 'desc' } : { rank: 'asc' };

    let skip = query.skip;
    let take = query.take;

    if (query.filter?.length > 1) throw new BadRequestException();
    if (query.filter?.[0] && !loggedInUserID) throw new UnauthorizedException();
    // Potentially a faster way of doing this in one query in raw SQL, something
    // to investigate when we move to that/query builder.
    if (query.filter?.[0] === 'around') {
      const whereAround: Prisma.LeaderboardRunWhereUniqueInput = {
        userID_gamemode_style_mapID_trackType_trackNum: {
          mapID,
          userID: loggedInUserID,
          gamemode: query.gamemode,
          trackType: query.trackType,
          trackNum: query.trackNum,
          style: query.style
        }
      };

      const userRun = await this.db.leaderboardRun.findUnique({
        where: whereAround
      });

      if (!userRun)
        throw new GoneException('User has no runs on this leaderboard');

      // Start at your rank, then backtrack by half of `take`, then 1 for your rank
      skip = Math.max(userRun.rank - Math.floor(take / 2) - 1, 0);
      // We include your rank, so increment `take` by 1.
      take = take + 1;
    } else if (query.filter?.[0] === 'friends') {
      // Regular skip/take should work fine here.

      // Fetch Steam friends, leave errors uncaught, this function will throw
      // an appropriate response.
      const steamFriends =
        await this.steamService.getSteamFriends(loggedInUserSteamID);

      if (steamFriends.length === 0)
        throw new GoneException('No friends detected :(');

      // Overrides filterSteamIDs if exists
      where.user = {
        steamID: { in: steamFriends.map((item) => BigInt(item.steamid)) }
      };
    }

    const dbResponse = await this.db.leaderboardRun.findManyAndCount({
      where,
      include: { user: true },
      omit,
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
    return new PagedResponseDto(LeaderboardRunDto, dbResponse);
  }

  async getRun(
    mapID: number,
    query: MapLeaderboardGetRunQueryDto,
    loggedInUserID?: number
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

    const omit: Prisma.LeaderboardRunOmit | undefined = query.expand
      ? undefined
      : { splits: true };

    const dbResponse = await this.db.leaderboardRun.findFirst({
      where,
      include: { user: true },
      omit
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
