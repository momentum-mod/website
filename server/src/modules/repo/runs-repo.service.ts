import { Injectable } from '@nestjs/common';
import { Prisma, PrismaPromise, Run, RunSession, RunSessionTimestamp, RunZoneStats } from '@prisma/client';
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

    //#region User Map Rank

    getAllUserMapRanks(
        where: Prisma.UserMapRankWhereInput,
        select?: Prisma.UserMapRankSelect
    ): PrismaPromise<unknown[]> {
        return this.prisma.userMapRank.findMany({
            where,
            select
        });
    }

    getUserMapRank(where: Prisma.UserMapRankWhereInput, include?: Prisma.UserMapRankInclude) {
        return this.prisma.userMapRank.findFirst({
            where,
            include
        });
    }

    getUserMapRankUnique(where: Prisma.UserMapRankWhereUniqueInput, include?: Prisma.UserMapRankInclude) {
        return this.prisma.userMapRank.findUnique({
            where,
            include
        });
    }

    createUserMapRank(data: Prisma.UserMapRankCreateInput, include?: Prisma.UserMapRankInclude) {
        return this.prisma.userMapRank.create({
            data: data,
            include: include
        });
    }

    async batchUpdateUserMapRank(
        updates: {
            where: Prisma.UserMapRankWhereUniqueInput;
            data: Prisma.UserMapRankUpdateInput;
        }[]
    ) {
        return await this.prisma.$transaction(
            updates.map((u) => this.prisma.userMapRank.update({ where: u.where, data: u.data }))
        );
    }

    updateUserMapRank(where: Prisma.UserMapRankWhereUniqueInput, data: Prisma.UserMapRankUpdateInput) {
        return this.prisma.userMapRank.update({
            where,
            data
        });
    }

    countUserMapRank(where: Prisma.UserMapRankWhereInput): Promise<number> {
        return this.prisma.userMapRank.count({ where: where });
    }

    //#endregion
}
