import { Gamemode, TrackType } from '../../../';
import { LeaderboardType } from '../../../enums/leaderboard-type.enum';

export interface MapSubmissionApproval {
  trackType: TrackType;
  trackNum: number;
  gamemode: Gamemode;
  tier: number;
  type: LeaderboardType;
}
