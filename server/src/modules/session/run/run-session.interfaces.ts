import {
  BaseStats as BaseStatsDB,
  Prisma,
  Rank,
  Run as RunDB
} from '@prisma/client';
import { XpGainDto } from '@common/dto/run/completed-run.dto';

export type ProcessedRun = Omit<
  RunDB,
  'id' | 'createdAt' | 'updatedAt' | 'overallStatsID' | 'file' | 'hash'
> & {
  overallStats: BaseStatsFromGame;
  zoneStats: ZoneStatsFromGame[];
};

export interface Replay {
  magic: number;
  version: number;
  header: {
    mapName: string;
    mapHash: string;
    playerName: string;
    steamID: bigint;
    tickRate: number;
    runFlags: number;
    runDate: string;
    startTick: number;
    stopTick: number;
    trackNum: number;
    zoneNum: number;
  };
  overallStats: BaseStatsFromGame;
  zoneStats: ZoneStatsFromGame[];
  frames: RunFrame[];
}

export type ReplayHeader = Omit<
  Replay,
  'overallStats' | 'zoneStats' | 'frames'
>;

export interface RunFrame {
  eyeAngleX: number;
  eyeAngleY: number;
  eyeAngleZ: number;
  posX: number;
  posY: number;
  posZ: number;
  viewOffset: number;
  buttons: number;
}

export type BaseStatsFromGame = Omit<
  BaseStatsDB,
  'id' | 'createdAt' | 'updatedAt'
>;

export type ZoneStatsFromGame = {
  zoneNum: number;
  baseStats: BaseStatsFromGame;
};

export interface StatsUpdateReturn {
  isPersonalBest: boolean;
  isWorldRecord: boolean;
  existingRank: Rank;
  rankCreate: Prisma.RankCreateWithoutRunInput;
  xp: XpGainDto;
}
