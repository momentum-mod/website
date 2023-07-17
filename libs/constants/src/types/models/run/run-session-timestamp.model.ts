import { RunSessionTimestamp as PrismaRunSessionTimestamp } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';

export type RunSessionTimestamp = NumberifyBigInt<PrismaRunSessionTimestamp>;
