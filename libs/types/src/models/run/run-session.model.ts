import { RunSession as PrismaRunSession } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';

export interface RunSession extends NumberifyBigInt<PrismaRunSession> {}

export interface CreateRunSession
  extends Pick<RunSession, 'trackNum' | 'zoneNum'> {
  mapID: number;
}

export interface UpdateRunSession {
  zoneNum: number;
  tick: number;
}
