import { Gamemode, TrackType } from '../../../';
import { LeaderboardType } from '../../../enums/leaderboard-type.enum';

export interface MapSubmissionApproval {
  trackType: TrackType;
  trackNum: number;
  gamemode: Gamemode;
  tier?: number | undefined; // Hidden leaderboards don't have tiers
  type: Exclude<LeaderboardType, LeaderboardType.IN_SUBMISSION>;
}
