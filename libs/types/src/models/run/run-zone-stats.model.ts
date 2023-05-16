import { RunZoneStats as PrismaRunZoneStats } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';

export interface RunZoneStats extends NumberifyBigInt<PrismaRunZoneStats> {}
