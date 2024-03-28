import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { MapsService } from '../maps/maps.service';
import { LeaderboardStatsDto } from '../../dto/run/leaderboard-stats.dto';
import { Leaderboard } from '@prisma/client';
import { DtoFactory } from '../../dto';

@Injectable()
export class LeaderboardService {
  constructor(
    @Inject(forwardRef(() => MapsService))
    private readonly mapsService: MapsService
  ) {}

  async getLeaderboardStats(
    mapID: number,
    userID?: number
  ): Promise<LeaderboardStatsDto[]> {
    const map = await this.mapsService.getMapAndCheckReadAccess({
      userID,
      mapID,
      select: {
        id: true,
        status: true,
        leaderboards: { include: { _count: { select: { runs: true } } } }
      }
    });

    return map.leaderboards.map(
      (leaderboard: Leaderboard & { _count: { runs: number } }) => {
        const obj = { leaderboard, totalRuns: leaderboard._count.runs };
        delete obj.leaderboard._count;
        return DtoFactory(LeaderboardStatsDto, obj);
      }
    );
  }
}
