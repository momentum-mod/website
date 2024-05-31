import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { MapStatus, RunsGetQuery } from '@momentum/constants';
import { PastRun, Prisma } from '@prisma/client';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { DtoFactory, PastRunDto, PastRunsGetAllQueryDto } from '../../dto';
import { PagedResponseDto } from '../../dto';
import { MapsService } from '../maps/maps.service';

@Injectable()
export class PastRunsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly mapsService: MapsService
  ) {}

  async getAll(
    query: PastRunsGetAllQueryDto,
    userID?: number
  ): Promise<PagedResponseDto<PastRunDto>> {
    if (query.userID && query.userIDs)
      throw new BadRequestException(
        'Only one of userID and userIDs may be used at the same time'
      );

    if (query.mapID && query.mapName)
      throw new BadRequestException(
        'Only one of mapID and mapName may be used at the same time'
      );

    const where: Prisma.PastRunWhereInput = {};

    // If a specific map is not given, only fetch approved stuff. Really don't
    // want to have to do perms checks on each map (extra DB call for each),
    // unlikely to be needed anyway.
    if (query.mapID) {
      await this.mapsService.getMapAndCheckReadAccess({
        mapID: query.mapID,
        userID
      });

      where.mapID = query.mapID;
    } else {
      where.mmap = { status: MapStatus.APPROVED };
      if (query.mapName) {
        where.mmap.name = { contains: query.mapName };
      }
    }

    if (query.userID) where.userID = query.userID;
    else if (query.userIDs) where.userID = { in: query.userIDs };

    if (query.flags) where.flags = { hasEvery: query.flags };

    if (query.isPB !== undefined) {
      where.leaderboardRun =
        query.isPB === true ? { isNot: null } : { is: null };
    }

    const include: Prisma.PastRunInclude = {
      user: query?.expand?.includes('user') ? true : undefined,
      // We need these for permission checks and isPB
      mmap: true,
      leaderboardRun: query?.expand?.includes('leaderboardRun')
        ? true
        : { select: { time: true } } // Don't care about value so select something small
    } satisfies Prisma.PastRunInclude;

    const dbResponse = await this.db.pastRun.findManyAndCount({
      where,
      include,
      skip: query.skip,
      take: query.take,
      orderBy: { [query.orderBy]: query.order }
    });

    const includeMap = query?.expand?.includes('map');
    const includeLbRun = query?.expand?.includes('leaderboardRun');
    for (const item of dbResponse[0] as PastRunWithPbData[]) {
      item.isPB = Boolean(item.leaderboardRun);
      if (!includeMap) delete item.mmap;
      if (!includeLbRun) delete item.leaderboardRun;
    }

    return new PagedResponseDto(PastRunDto, dbResponse);
  }

  async get(
    pastRunID: number,
    query: RunsGetQuery,
    userID?: number
  ): Promise<PastRunDto> {
    const include = {
      user: query?.expand?.includes('user') ? true : undefined,
      mmap: true,
      leaderboardRun: query?.expand?.includes('leaderboardRun')
        ? true
        : { select: { time: true } }
    };

    const dbResponse = await this.db.pastRun.findUnique({
      where: { id: pastRunID },
      include
    });

    if (!dbResponse) throw new NotFoundException('Run not found');

    if (dbResponse.mmap.status !== MapStatus.APPROVED) {
      await this.mapsService.getMapAndCheckReadAccess({
        map: dbResponse.mmap,
        userID
      });
    }

    (dbResponse as PastRunWithPbData).isPB = Boolean(dbResponse.leaderboardRun);
    if (!query?.expand?.includes('map')) delete dbResponse.mmap;
    if (!query?.expand?.includes('leaderboardRun'))
      delete dbResponse.leaderboardRun;

    return DtoFactory(PastRunDto, dbResponse);
  }
}

type PastRunWithPbData = PastRun & {
  user?: unknown;
  leaderboardRun?: unknown;
  mmap?: unknown;
  isPB?: boolean;
};
