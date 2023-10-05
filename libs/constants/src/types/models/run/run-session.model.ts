import { RunSession as PrismaRunSession } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';

export type RunSession = NumberifyBigInt<PrismaRunSession>;

export interface CreateRunSession
  extends Pick<RunSession, 'mapID' | 'gamemode' | 'trackType' | 'trackNum'> {
  segment: number;
}

export interface UpdateRunSession extends Pick<CreateRunSession, 'segment'> {
  checkpoint: number;
  time: number;
}
