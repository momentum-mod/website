import { LeaderboardType } from '../enums/leaderboard-type.enum';

export const LeaderboardTypeName: ReadonlyMap<LeaderboardType, string> =
  new Map([
    [LeaderboardType.RANKED, 'Ranked'],
    [LeaderboardType.UNRANKED, 'Unranked'],
    [LeaderboardType.HIDDEN, 'Hidden']
  ]);
