import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CosXpParams, RankXpParams, XpParams } from '../xp-systems/xp-systems.interface';
import { DatabaseError } from './repo.error';

@Injectable()
export class XpSystemsRepoService {
    constructor(private prisma: PrismaService) {}

    async getXpParams(): Promise<XpParams | undefined> {
        const dbResponse = await this.prisma.xpSystems.findUnique({ where: { id: 1 } });

        if (!dbResponse) return undefined;

        return {
            rankXP: dbResponse.rankXP as RankXpParams,
            cosXP: dbResponse.cosXP as CosXpParams
        };
    }

    async setXpParams(rankParams: RankXpParams, cosParams: CosXpParams): Promise<void> {
        await this.prisma.xpSystems.update({ where: { id: 1 }, data: { rankXP: rankParams, cosXP: cosParams } });
    }

    async initXpParams(rankParams: RankXpParams, cosParams: CosXpParams): Promise<void> {
        if ((await this.prisma.xpSystems.count()) > 0)
            throw new DatabaseError("Tried to init XP systems, but the table wasn't empty!");

        await this.prisma.xpSystems.create({ data: { id: 1, rankXP: rankParams, cosXP: cosParams } });
    }

    async getRankXpParams(): Promise<RankXpParams> {
        const { rankXP } = await this.prisma.xpSystems.findUnique({ where: { id: 1 } });
        return rankXP as RankXpParams;
    }

    async setRankXpParams(params: RankXpParams): Promise<void> {
        await this.prisma.xpSystems.update({ where: { id: 1 }, data: { rankXP: params } });
    }

    async getCosXpParams(): Promise<CosXpParams> {
        const { cosXP } = await this.prisma.xpSystems.findUnique({ where: { id: 1 } });
        return cosXP as CosXpParams;
    }

    async setCosXpParams(cosParams: CosXpParams): Promise<void> {
        await this.prisma.xpSystems.update({ where: { id: 1 }, data: { cosXP: cosParams } });
    }
}
