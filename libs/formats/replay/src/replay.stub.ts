import { REPLAY_MAGIC, ReplayHeader } from './index';
import { Gamemode, TrackType, RunSplits, Style } from '@momentum/constants';

export const BaseTime = 1000000000000;

export const ReplayHeaderStub: ReplayHeader = {
  magic: REPLAY_MAGIC,
  formatVersion: -1,
  timestamp: BaseTime + 40000,
  mapName: 'bhop_map',
  mapHash: 'A'.repeat(40),
  gamemode: Gamemode.BHOP,
  compression: 0,
  tickInterval: 0.00999999991324,
  playerSteamID: 1n,
  playerName: 'Abstract Barry',
  trackType: TrackType.MAIN,
  trackNum: 1,
  style: Style.NORMAL,
  runTime: 40
};

export const StatsStub: RunSplits.Stats = {
  jumps: 1,
  strafes: 1,
  horizontalDistanceTravelled: 1,
  overallDistanceTravelled: 1,
  maxOverallSpeed: 1,
  maxHorizontalSpeed: 1
};

/** Run.Splits validly corresponding main track run of to ZonesStub */
export const RunSplitsStub: RunSplits.Splits = {
  trackStats: {
    jumps: 1,
    strafes: 1,
    horizontalDistanceTravelled: 1,
    overallDistanceTravelled: 1000,
    maxOverallSpeed: 100,
    maxHorizontalSpeed: 1
  },
  segments: [
    {
      checkpointsOrdered: true,
      effectiveStartVelocity: { x: 100, y: -100, z: 0 },
      subsegments: [
        {
          velocityWhenReached: { x: 0, y: 0, z: 3500 },
          timeReached: 0,
          minorNum: 1,
          stats: { ...StatsStub }
        },
        {
          velocityWhenReached: { x: 0, y: 0, z: 3500 },
          timeReached: 10,
          minorNum: 2,
          stats: { ...StatsStub }
        }
      ],
      segmentStats: { ...StatsStub }
    },
    {
      checkpointsOrdered: true,
      effectiveStartVelocity: { x: 100, y: -100, z: 0 },
      subsegments: [
        {
          velocityWhenReached: { x: 0, y: 0, z: 3500 },
          timeReached: 20,
          minorNum: 1,
          stats: { ...StatsStub }
        },
        {
          velocityWhenReached: { x: 0, y: 0, z: 3500 },
          timeReached: 30,
          minorNum: 2,
          stats: { ...StatsStub }
        }
      ],
      segmentStats: { ...StatsStub }
    }
  ]
};
