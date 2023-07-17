import { BaseStats as PrismaBaseStats } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';

export type BaseStats = NumberifyBigInt<PrismaBaseStats>;
