import {
  double,
  float,
  int32,
  TrackType,
  uint64,
  uint8
} from '@momentum/constants';
import { magic } from '@momentum/util-fn';

export const REPLAY_MAGIC: int32 = magic('MMTV');
export const REPLAY_HEADER_SIZE: int32 = 195;
export const REPLAY_SPLITS_OFFSET: int32 = REPLAY_HEADER_SIZE + 4;

export * as Reader from './replay-reader';
export * as Writer from './replay-writer';
export * as Stubs from './replay.stub';

/**
 * ReplayHeader struct in C++
 * 194 bytes total, packed on byte boundaries with #pragma pack(1)
 * @see momtv.h, mom_timer_defs.h (licensee-only)
 */
// prettier-ignore
export interface ReplayHeader {
  //                         Size  Offset  Description
  magic: int32;           // 4     0
  formatVersion: int32;   // 4     4
  timestamp: number;      // 8     8       Unix time (ms) written when the replay file is created
  mapName: string;        // 64    16
  mapHash: string;        // 41    80
  gamemode: uint8;        // 1     121
  compression: uint8;     // 1     122
  tickInterval: float;    // 4     123
  playerSteamID: uint64;  // 8     127
  playerName: string;     // 32    135
  trackType: TrackType;   // 1     167
  trackNum: uint8;        // 1     168
  style: uint8;           // 1     169
  runTime: double;        // 8     170
                          // 17    178     Other replay data, unused by us
}
