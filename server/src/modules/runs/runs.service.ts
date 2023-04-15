import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { RunDto } from '@common/dto/run/run.dto';
import { DtoFactory, ExpandToPrismaIncludes } from '@lib/dto.lib';
import { RunsRepoService } from '../repo/runs-repo.service';
import { MapsCtlRunsGetAllQuery, RunsGetAllQuery, UserCtlRunsGetAllQuery } from '@common/dto/query/run-queries.dto';
import { ConfigService } from '@nestjs/config';
import { FileStoreCloudService } from '../filestore/file-store-cloud.service';

@Injectable()
export class RunsService {
    constructor(
        private readonly runRepo: RunsRepoService,
        private readonly configService: ConfigService,
        private readonly fileCloudService: FileStoreCloudService
    ) {}

    async get(runID: number, expand: string[]): Promise<RunDto> {
        const where: Prisma.RunWhereUniqueInput = { id: runID };
        const include: Prisma.RunInclude = {
            user: true,
            ...ExpandToPrismaIncludes(expand?.filter((x) => ['overallStats', 'map', 'rank', 'zoneStats'].includes(x)))
        };

        if (expand?.includes('mapWithInfo')) include.map = { include: { info: true } };

        const dbResponse = await this.runRepo.getRunUnique(where, include);

        if (!dbResponse) throw new NotFoundException('Run not found');

        return DtoFactory(RunDto, dbResponse);
    }

    async getAll(
        query: RunsGetAllQuery | MapsCtlRunsGetAllQuery | UserCtlRunsGetAllQuery
    ): Promise<PaginatedResponseDto<RunDto>> {
        const where: Prisma.RunWhereInput = {};
        let include: Prisma.RunInclude = {};
        const orderBy: Prisma.RunOrderByWithRelationInput = {};

        if (query instanceof UserCtlRunsGetAllQuery) {
            where.userID = query.userID;
        } else {
            include = {
                user: true,
                ...ExpandToPrismaIncludes(
                    query.expand?.filter((x) => ['overallStats', 'zoneStats', 'rank', 'map'].includes(x))
                )
            };

            if (query.expand?.includes('mapWithInfo')) include.map = { include: { info: true } };

            if (query.userID && query.userIDs)
                throw new BadRequestException('Only one of userID and userIDs may be used at the same time');

            if (!(query instanceof MapsCtlRunsGetAllQuery)) {
                if (query.mapID && query.mapName)
                    throw new BadRequestException('Only one of mapID and mapName may be used at the same time');

                if (query.mapID) where.mapID = query.mapID;
                else if (query.mapName) where.map = { name: { contains: query.mapName } };
            }

            if (query.userID) where.userID = query.userID;
            else if (query.userIDs) where.userID = { in: query.userIDs };

            if (query.isPB) where.rank = { isNot: null };

            if (query.flags) where.flags = query.flags; // Currently checks for exact equality, will change in 0.10.0

            if (query.order === 'date') orderBy.createdAt = 'desc';
            else orderBy.ticks = 'asc';
        }

        const dbResponse = await this.runRepo.getAllRuns(where, query.skip, query.take, include, orderBy);

        return new PaginatedResponseDto(RunDto, dbResponse);
    }

    async getURL(runID: number): Promise<string> {
        const run = await this.runRepo.getRun({ id: runID });
        if (!run) throw new NotFoundException('Run not found.');

        const cdnURL = this.configService.get('storage.endpointUrl');
        const bucketName = this.configService.get('storage.bucketName');

        return `${cdnURL}/${bucketName}/${run.file}`;
    }

    async deleteStoredMapRuns(mapID: number): Promise<void> {
        const [runs] = await this.runRepo.getAllRuns({ mapID });

        await Promise.all(runs.map((run) => this.fileCloudService.deleteFileCloud(`runs/${run.id}`)));
    }
}
