import { RunSession as PrismaRunSession } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';

export type RunSession = NumberifyBigInt<PrismaRunSession>;

export interface CreateRunSession
  extends Pick<RunSession, 'trackNum' | 'zoneNum'> {
  mapID: number;
}

export interface UpdateRunSession {
  zoneNum: number;
  tick: number;
}
