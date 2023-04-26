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
  overallStats: BaseStats;
  zoneStats: ZoneStats[];
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

// This should correspond to both Prisma and game's BaseStats model
export type BaseStats = {
  jumps: number;
  strafes: number;
  avgStrafeSync: number;
  avgStrafeSync2: number;
  enterTime: number;
  totalTime: number;
  velAvg3D: number;
  velAvg2D: number;
  velMax3D: number;
  velMax2D: number;
  velEnter3D: number;
  velEnter2D: number;
  velExit3D: number;
  velExit2D: number;
};

export type ZoneStats = {
  zoneNum: number;
  baseStats: BaseStats;
};
