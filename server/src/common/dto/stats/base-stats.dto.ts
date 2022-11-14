import { BaseStats } from '@prisma/client';

export class BaseStatsDto implements BaseStats {
    id: bigint;
    jumps: number;
    strafes: number;
    avgStrafeSync: number;
    avgStrafeSync2: number;
    enterTime: number;
    totalTime: number;
    velAvg3D: number;
    velAvg2D: number;
    velMax3D: number;
    velMax2D: number;
    velEnter3D: number;
    velEnter2D: number;
    velExit3D: number;
    velExit2D: number;
    createdAt: Date;
    updatedAt: Date;
}
