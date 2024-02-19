import { LeaderboardDto } from './leaderboard.dto';
import { LeaderboardStats } from '@momentum/constants';
import { NestedProperty } from '../decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class LeaderboardStatsDto implements LeaderboardStats {
  @NestedProperty(LeaderboardDto)
  leaderboard: LeaderboardDto;

  @ApiProperty({ description: 'The total number of runs for this leaderboard' })
  @IsInt()
  totalRuns: number;
}
