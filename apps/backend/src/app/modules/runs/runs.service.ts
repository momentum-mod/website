import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';
import {
  DtoFactory,
  expandToPrismaIncludes,
  PagedResponseDto,
  RunDto,
  RunsGetAllQueryDto
} from '@momentum/backend/dto';
import { DbService } from '../database/db.service';

@Injectable()
export class RunsService {
  constructor(
    private readonly db: DbService,
    private readonly configService: ConfigService,
    private readonly fileCloudService: FileStoreCloudService
  ) {}

  async get(runID: number, expand: string[]): Promise<RunDto> {
    const include: Prisma.RunInclude = {
      user: true,
      ...expandToPrismaIncludes(
        expand?.filter((x) =>
          ['overallStats', 'map', 'rank', 'zoneStats'].includes(x)
        )
      )
    };

    if (expand?.includes('mapWithInfo'))
      include.map = { include: { info: true } };

    const dbResponse = await this.db.run.findUnique({
      where: { id: runID },
      include: include
    });

    if (!dbResponse) throw new NotFoundException('Run not found');

    return DtoFactory(RunDto, dbResponse);
  }

  async getAll(query: RunsGetAllQueryDto): Promise<PagedResponseDto<RunDto>> {
    const where: Prisma.RunWhereInput = {};
    let include: Prisma.RunInclude = {};
    const orderBy: Prisma.RunOrderByWithRelationInput = {};

    include = {
      user: true,
      ...expandToPrismaIncludes(
        query.expand?.filter((x) =>
          ['overallStats', 'zoneStats', 'rank', 'map'].includes(x)
        )
      )
    };

    if (query.expand?.includes('mapWithInfo'))
      include.map = { include: { info: true } };

    if (query.userID && query.userIDs)
      throw new BadRequestException(
        'Only one of userID and userIDs may be used at the same time'
      );

    if (query.mapID && query.mapName)
      throw new BadRequestException(
        'Only one of mapID and mapName may be used at the same time'
      );

    if (query.mapID) where.mapID = query.mapID;
    else if (query.mapName) where.map = { name: { contains: query.mapName } };

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

  async getURL(runID: number): Promise<string> {
    const run = await this.db.run.findUnique({ where: { id: runID } });

    if (!run) throw new NotFoundException('Run not found.');

    const cdnURL = this.configService.get('storage.endpointUrl');
    const bucketName = this.configService.get('storage.bucketName');

    return `${cdnURL}/${bucketName}/${run.file}`;
  }

  async deleteStoredMapRuns(mapID: number): Promise<void> {
    const runs = await this.db.run.findMany({ where: { mapID } });

    await Promise.all(
      runs.map((run) => this.fileCloudService.deleteFileCloud(`runs/${run.id}`))
    );
  }
}
