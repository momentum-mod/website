import {
  ImATeapotException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, Rank } from '@prisma/client';
import { SteamService } from '../steam/steam.service';
import {
  DtoFactory,
  MapRankGetNumberQueryDto,
  MapRanksGetQueryDto,
  PagedResponseDto,
  RankDto
} from '@momentum/backend/dto';
import { DbService } from '../database/db.service';

@Injectable()
export class RanksService {
  constructor(
    private readonly db: DbService,
    private readonly steamService: SteamService
  ) {}
  async getRanks(
    mapID: number,
    query: MapRanksGetQueryDto
  ): Promise<PagedResponseDto<RankDto>> {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('Map not found');

    const where: Prisma.RankWhereInput = {
      mapID: mapID,
      flags: query.flags
    };

    if (query.playerID) where.userID = query.playerID;
    if (query.playerIDs) where.userID = { in: query.playerIDs };

    const include = { run: true, user: true };

    const orderBy: Prisma.RankOrderByWithAggregationInput = {};
    if (query.orderByDate !== undefined)
      orderBy.createdAt = query.orderByDate ? 'desc' : 'asc';
    else orderBy.rank = 'asc';

    const dbResponse = await this.db.rank.findManyAndCount({
      where,
      include,
      orderBy,
      skip: query.skip,
      take: query.take
    });

    if (!dbResponse) throw new NotFoundException('No ranks found for map');

    this.formatRanksDbResponse(dbResponse[0]);

    return new PagedResponseDto(RankDto, dbResponse);
  }

  async getRankNumber(
    mapID: number,
    rankNumber: number,
    query: MapRankGetNumberQueryDto
  ): Promise<RankDto> {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('Map not found');

    const where: Prisma.RankWhereInput = {
      mapID: mapID,
      rank: rankNumber,
      flags: 0,
      run: {
        trackNum: 0,
        zoneNum: 0
      }
    };

    if (query.flags) where.flags = query.flags;
    if (query.trackNum) where.run.trackNum = query.trackNum;
    if (query.zoneNum) where.run.zoneNum = query.zoneNum;

    const dbResponse = await this.db.rank.findFirst({
      where,
      include: { run: true, user: true }
    });

    if (!dbResponse) throw new NotFoundException('Rank not found');

    // Same approach as formatRanksDbResponse
    return DtoFactory(RankDto, {
      ...dbResponse,
      trackNum: dbResponse.run.trackNum,
      zoneNum: dbResponse.run.zoneNum
    });
  }

  async getRankAround(
    userID: number,
    mapID: number,
    query: MapRankGetNumberQueryDto
  ): Promise<PagedResponseDto<RankDto>> {
    const where: Prisma.RankWhereInput = {
      mapID: mapID,
      flags: 0,
      userID: userID,
      run: {
        trackNum: 0,
        zoneNum: 0
      }
    };

    if (query.flags) where.flags = query.flags;
    if (query.trackNum) where.run.trackNum = query.trackNum;
    if (query.zoneNum) where.run.zoneNum = query.zoneNum;

    const include = { run: true, user: true };

    const orderBy: Prisma.RankOrderByWithAggregationInput = { rank: 'asc' };

    const userRankInfo = await this.db.rank.findFirst({
      where
    });

    if (!userRankInfo) throw new NotFoundException('No personal best found');

    const userRank = userRankInfo.rank;

    // Reuse the previous query
    where.userID = undefined;

    // Don't care about the count
    const ranks = await this.db.rank.findMany({
      where,
      include,
      orderBy,
      // Minus 6 here because offset will skip the number of rows provided
      // Example: if you want to offset to rank 9, you set offset to 8
      skip: Math.max(userRank - 6, 0),
      take: 11 // 5 + yours + 5
    });

    this.formatRanksDbResponse(ranks);

    return new PagedResponseDto(RankDto, [ranks, ranks.length]);
  }

  async getRankFriends(
    steamID: bigint,
    mapID: number,
    query: MapRankGetNumberQueryDto
  ): Promise<PagedResponseDto<RankDto>> {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('Map not found');

    const steamFriends = await this.steamService.getSteamFriends(steamID);

    if (steamFriends.length === 0)
      throw new ImATeapotException('No friends detected :(');

    const friendSteamIDs = steamFriends.map((item) => BigInt(item.steamid));

    const where: Prisma.RankWhereInput = {
      mapID: mapID,
      flags: 0,
      user: { steamID: { in: friendSteamIDs } },
      run: { trackNum: 0, zoneNum: 0 }
    };

    if (query.flags) where.flags = query.flags;
    if (query.trackNum) where.run.trackNum = query.trackNum;
    if (query.zoneNum) where.run.zoneNum = query.zoneNum;

    // Don't care about the count
    const ranks = await this.db.rank.findMany({
      where,
      include: { run: true, user: true }
    });

    this.formatRanksDbResponse(ranks);

    return new PagedResponseDto(RankDto, [ranks, ranks.length]);
  }

  // This is done because the MapRankDto still contains trackNum and zoneNum to
  // conform to old API but Rank model doesn't. Probably worth changing
  // frontend/game code in future.
  private formatRanksDbResponse(
    ranks: (Rank & { trackNum?: any; zoneNum?: any })[]
  ) {
    for (const mapRank of ranks) {
      mapRank.trackNum = (mapRank as any).run.trackNum;
      mapRank.zoneNum = (mapRank as any).run.zoneNum;
    }
  }
}
