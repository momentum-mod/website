import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { FileStoreService } from '../filestore/file-store.service';
import {
  DtoFactory,
  PagedResponseDto,
  RunDto,
  RunsGetAllQueryDto
} from '@momentum/backend/dto';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { expandToIncludes } from '@momentum/util-fn';
import { runPath, RunsGetAllExpand } from '@momentum/constants';

@Injectable()
export class RunsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly configService: ConfigService,
    private readonly fileStoreService: FileStoreService
  ) {}

  async get(runID: number, expand: RunsGetAllExpand): Promise<RunDto> {
    const include: Prisma.RunInclude = {
      user: true,
      ...expandToIncludes(expand, {
        mappings: [
          { expand: 'map', model: 'mmap' },
          {
            expand: 'mapWithInfo',
            model: 'mmap',
            value: { include: { info: true } }
          }
        ]
      })
    };

    const dbResponse = await this.db.pastRun.findUnique({
      where: { id: runID },
      include
    });

    if (!dbResponse) throw new NotFoundException('Run not found');

    return DtoFactory(RunDto, dbResponse);
  }

  async getAll(query: RunsGetAllQueryDto): Promise<PagedResponseDto<RunDto>> {
    const where: Prisma.RunWhereInput = {};
    const orderBy: Prisma.RunOrderByWithRelationInput = {};
    const include: Prisma.RunInclude = {
      user: true,
      ...expandToIncludes(query.expand, {
        mappings: [
          { expand: 'map', model: 'mmap' },
          {
            expand: 'mapWithInfo',
            model: 'mmap',
            value: { include: { info: true } }
          }
        ]
      })
    };

    if (query.userID && query.userIDs)
      throw new BadRequestException(
        'Only one of userID and userIDs may be used at the same time'
      );

    if (query.mapID && query.mapName)
      throw new BadRequestException(
        'Only one of mapID and mapName may be used at the same time'
      );

    if (query.mapID) where.mapID = query.mapID;
    else if (query.mapName) where.mmap = { name: { contains: query.mapName } };

    if (query.userID) where.userID = query.userID;
    else if (query.userIDs) where.userID = { in: query.userIDs };

    if (query.isPB) where.rank = { isNot: null };

    if (query.flags) where.flags = query.flags; // Currently checks for exact equality, will change in 0.10.0

    if (query.order === 'date') orderBy.createdAt = 'desc';
    else orderBy.ticks = 'asc';

    const dbResponse = await this.db.run.findManyAndCount({
      where,
      skip: query.skip,
      take: query.take,
      include,
      orderBy
    });

    return new PagedResponseDto(RunDto, dbResponse);
  }

  async deleteStoredMapRuns(mapID: number): Promise<void> {
    const runs = await this.db.run.findMany({ where: { mapID } });

    await Promise.all(
      runs.map((run) => this.fileStoreService.deleteFile(runPath(run.id)))
    );
  }
}
