import { Injectable } from '@nestjs/common';
import { Prisma, Run } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class RunsRepoService {
    constructor(private prisma: PrismaService) {}

    async getAll(
        where: Prisma.RunWhereInput,
        skip?: number,
        take?: number,
        include?: Prisma.RunInclude,
        orderBy?: Prisma.RunOrderByWithRelationInput
    ): Promise<[Run[], number]> {
        const count = await this.prisma.run.count({
            where: where
        });

        const runs = await this.prisma.run.findMany({
            where: where,
            skip: skip,
            take: take,
            include: include,
            orderBy: orderBy
            // Old api has a distinct: true in the query, but it shouldn't be needed
            // since we shouldn't have any duplicate runs
        });

        return [runs, count];
    }
}
