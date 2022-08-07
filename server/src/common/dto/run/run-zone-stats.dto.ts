import { RunZoneStats } from '@prisma/client';

export class RunZoneStatsDto implements RunZoneStats {
    id: number;
    zoneNum: number;
    runID: bigint;
    baseStatsID: bigint;
    createdAt: Date;
    updatedAt: Date;
}
