import { Injectable } from '@nestjs/common';
import { Prisma, Rank, Run, RunSession, RunSessionTimestamp, RunZoneStats } from '@prisma/client';
import { PrismaService } from './prisma.service';

const runSessionCompletedInclude = {
    timestamps: true,
    track: {
        include: {
            map: { include: { info: true, stats: true } },
            stats: { include: { baseStats: true } },
            zones: { include: { stats: { include: { baseStats: true } } } }
        }
    },
    user: true
};

const runSessionCompletedIncludeValidator = Prisma.validator<Prisma.RunSessionArgs>()({
    include: runSessionCompletedInclude
});

export type RunSessionCompleted = Prisma.RunSessionGetPayload<typeof runSessionCompletedIncludeValidator>;

@Injectable()
export class RunsRepoService {
    constructor(private prisma: PrismaService) {}

    //#region Run

    async getAllRuns(
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

    getRun(where: Prisma.RunWhereInput, include?: Prisma.RunInclude): Promise<Run> {
        return this.prisma.run.findFirst({
            where,
            include
        });
    }

    getRunUnique(where: Prisma.RunWhereUniqueInput, include?: Prisma.RunInclude): Promise<Run> {
        return this.prisma.run.findUnique({
            where: where,
            include: include
        });
    }

    createRun(data: Prisma.RunCreateInput, include?: Prisma.RunInclude) {
        return this.prisma.run.create({
            data: data,
            include: include
        });
    }

    updateRun(where: Prisma.RunWhereUniqueInput, data: Prisma.RunUpdateInput) {
        return this.prisma.run.update({
            where,
            data
        });
    }

    // TODO: when moving to prismapromise returns idk if we want to return the batchpayload stuff
    async deleteRun(where: Prisma.RunWhereInput): Promise<void> {
        await this.prisma.run.deleteMany({ where: where });
    }

    //#endregion

    //#region RunSession

    createRunSession(data: Prisma.RunSessionCreateInput, include?: Prisma.RunSessionInclude): Promise<RunSession> {
        return this.prisma.runSession.create({ data: data, include: include });
    }

    getRunSession(where: Prisma.RunSessionWhereInput, include?: Prisma.RunSessionInclude): Promise<RunSession> {
        return this.prisma.runSession.findFirst({
            where: where,
            include: include
        });
    }

    getRunSessionUnique(sessionID: number, include?: Prisma.RunSessionInclude): Promise<RunSession> {
        return this.prisma.runSession.findUnique({ where: { id: sessionID }, include: include });
    }

    getRunSessionCompleted(sessionID: number): Promise<RunSessionCompleted> {
        return this.prisma.runSession.findUnique({
            where: { id: sessionID },
            include: runSessionCompletedInclude
        });
    }

    async deleteRunSession(where: Prisma.RunSessionWhereInput): Promise<void> {
        await this.prisma.runSession.deleteMany({ where: where });
    }

    deleteRunSessionUnique(where: Prisma.RunSessionWhereUniqueInput): Promise<RunSession> {
        // If this errors we want to catch in service logic
        return this.prisma.runSession.delete({ where: where });
    }

    createRunSessionTimestamp(data: Prisma.RunSessionTimestampCreateInput): Promise<RunSessionTimestamp> {
        return this.prisma.runSessionTimestamp.create({ data: data });
    }

    //#endregion

    //#region RunZoneStats

    createRunZoneStats(data: Prisma.RunZoneStatsCreateInput): Promise<RunZoneStats> {
        return this.prisma.runZoneStats.create({ data: data });
    }

    getRunZoneStats(where: Prisma.RunZoneStatsWhereInput, include?: Prisma.RunZoneStatsInclude) {
        return this.prisma.runZoneStats.findFirst({
            where: where,
            include: include
        });
    }

    updateRunZoneStats(where: Prisma.RunZoneStatsWhereUniqueInput, data: Prisma.RunZoneStatsUpdateInput) {
        return this.prisma.runZoneStats.update({
            where,
            data
        });
    }

    //#endregion

    //#region Rank

    async getRanks(
        where?: Prisma.RankWhereInput,
        include?: Prisma.RankInclude,
        select?: Prisma.RankSelect,
        order?: Prisma.RankOrderByWithAggregationInput,
        skip?: number,
        take?: number
    ): Promise<[Rank[], number]> {
        const count = await this.prisma.rank.count({
            where: where,
            skip: skip,
            take: take
        });
        return [
            await this.prisma.rank.findMany({
                where: where,
                include: include,
                orderBy: order,
                skip: skip,
                take: take
            }),
            count
        ];
    }

    getRank(where: Prisma.RankWhereInput, include?: Prisma.RankInclude) {
        return this.prisma.rank.findFirst({
            where,
            include
        });
    }

    getRankUnique(where: Prisma.RankWhereUniqueInput, include?: Prisma.RankInclude) {
        return this.prisma.rank.findUnique({
            where,
            include
        });
    }

    createRank(data: Prisma.RankCreateInput, include?: Prisma.RankInclude) {
        return this.prisma.rank.create({
            data: data,
            include: include
        });
    }

    batchUpdateRank(
        updates: {
            where: Prisma.RankWhereUniqueInput;
            data: Prisma.RankUpdateInput;
        }[]
    ) {
        return this.prisma.$transaction(updates.map((u) => this.prisma.rank.update({ where: u.where, data: u.data })));
    }

    updateRanks(where: Prisma.RankWhereInput, data: Prisma.RankUpdateInput) {
        return this.prisma.rank.updateMany({
            where,
            data
        });
    }

    updateRank(where: Prisma.RankWhereUniqueInput, data: Prisma.RankUpdateInput) {
        return this.prisma.rank.update({
            where,
            data
        });
    }

    countRank(where: Prisma.RankWhereInput): Promise<number> {
        return this.prisma.rank.count({ where: where });
    }

    //#endregion
}
