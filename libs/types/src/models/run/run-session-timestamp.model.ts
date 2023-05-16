import { RunSessionTimestamp as PrismaRunSessionTimestamp } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';

export interface RunSessionTimestamp
  extends NumberifyBigInt<PrismaRunSessionTimestamp> {}
