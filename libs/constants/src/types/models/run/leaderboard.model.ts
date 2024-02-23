import { Leaderboard as PrismaLeaderboard } from '@prisma/client';
import { LeaderboardType } from '../../../enums/leaderboard-type.enum';

export type Leaderboard = PrismaLeaderboard & {
  type: LeaderboardType;
};
