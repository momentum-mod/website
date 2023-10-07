import { Gamemode, TrackType } from '../../../';

export interface MapSubmissionApproval {
  trackType: TrackType;
  trackNum: number;
  gamemode: Gamemode;
  tier: number;
  ranked: boolean;
}
