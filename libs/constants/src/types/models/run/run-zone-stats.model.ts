import { RunZoneStats as PrismaRunZoneStats } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';

export type RunZoneStats = NumberifyBigInt<PrismaRunZoneStats>;
