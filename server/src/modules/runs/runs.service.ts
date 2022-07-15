import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { RunDto } from '../../@common/dto/run/runs.dto';
import { DtoFactory, ExpandToPrismaIncludes } from '../../@common/utils/dto.utility';
import { RunsRepoService } from '../repo/runs-repo.service';

@Injectable()
export class RunsService {
    constructor(private readonly runRepo: RunsRepoService) {}

    async get(runID: number, expand: string[]): Promise<RunDto> {
        const where: Prisma.RunWhereUniqueInput = { id: runID };
        const include: Prisma.RunInclude = {
            user: true,
            ...ExpandToPrismaIncludes(expand?.filter((x) => ['baseStats', 'map', 'rank', 'zoneStats'].includes(x)))
        };

        if (expand?.includes('mapWithInfo')) include.map = { include: { info: true } };

        const dbResponse = await this.runRepo.get(where, include);

        if (!dbResponse) throw new NotFoundException('Run not found');

        return DtoFactory(RunDto, dbResponse);
    }

    async getAll(
        skip?: number,
        take?: number,
        mapID?: number,
        mapName?: string,
        userID?: number,
        userIDs?: number[],
        flags?: number,
        isPB?: boolean,
        order?: string,
        expand?: string[]
    ): Promise<PaginatedResponseDto<RunDto>> {
        const where: Prisma.RunWhereInput = {};
        const include: Prisma.RunInclude = {
            user: true,
            ...ExpandToPrismaIncludes(expand?.filter((x) => ['baseStats', 'zoneStats', 'rank', 'map'].includes(x)))
        };

        const orderBy: Prisma.RunOrderByWithRelationInput = {};

        if (expand?.includes('mapWithInfo')) include.map = { include: { info: true } };

        if (userID && userIDs)
            throw new BadRequestException('Only one of userID and userIDs may be used at the same time');

        if (mapID && mapName)
            throw new BadRequestException('Only one of mapID and mapName may be used at the same time');

        if (mapID) where.mapID = mapID;
        else if (mapName) where.map = { name: { contains: mapName } };

        if (userID) where.userID = userID;
        else if (userIDs) where.userID = { in: userIDs };

        if (isPB) where.rank = { isNot: null };

        if (flags) where.flags = flags; // Currently checks for exact equality, will change in 0.10.0

        if (order === 'date') orderBy.createdAt = 'desc';
        else orderBy.ticks = 'asc';

        const dbResponse = await this.runRepo.getAll(where, skip, take, include, orderBy);
        return new PaginatedResponseDto(RunDto, dbResponse);
    }
}
