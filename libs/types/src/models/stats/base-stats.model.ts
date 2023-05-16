import { BaseStats as PrismaBaseStats } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';

export interface BaseStats extends NumberifyBigInt<PrismaBaseStats> {}
