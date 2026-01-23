import { LeaderboardType } from '../enums/leaderboard-type.enum';
import { CompleteMap } from '../types/utils/compete-map.type';

export const LeaderboardTypeName: ReadonlyMap<LeaderboardType, string> =
  new Map([
    [LeaderboardType.RANKED, 'Ranked'],
    [LeaderboardType.UNRANKED, 'Unranked'],
    [LeaderboardType.HIDDEN, 'Hidden'],
    [LeaderboardType.IN_SUBMISSION, 'In Submission']
  ]) satisfies CompleteMap<LeaderboardType>;
