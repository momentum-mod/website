import { Gamemode, GamemodeInfo, LeaderboardType } from '@momentum/constants';
import {
  findMainGamemodeIndex,
  getSpecificGroupedLeaderboard,
  GroupedMapLeaderboards
} from './grouped-map-leaderboards.util';

describe('grouped-map-leaderboards', () => {
  function testLbs(): GroupedMapLeaderboards {
    return [
      {
        gamemode: Gamemode.DEFRAG_VQ3,
        gamemodeName: GamemodeInfo.get(Gamemode.DEFRAG_VQ3).name,
        allHidden: true,
        tier: 3,
        type: LeaderboardType.HIDDEN,
        tags: [],
        linear: true,
        stages: 5
      },
      {
        gamemode: Gamemode.DEFRAG_CPM,
        gamemodeName: GamemodeInfo.get(Gamemode.DEFRAG_CPM).name,
        allHidden: false,
        tier: 3,
        type: LeaderboardType.UNRANKED,
        tags: [],
        linear: true,
        stages: 5
      },
      {
        gamemode: Gamemode.SJ,
        gamemodeName: GamemodeInfo.get(Gamemode.SJ).name,
        allHidden: false,
        tier: 4,
        type: LeaderboardType.RANKED,
        tags: [],
        linear: true,
        stages: 5
      },
      {
        gamemode: Gamemode.SURF,
        gamemodeName: GamemodeInfo.get(Gamemode.SURF).name,
        allHidden: true,
        tier: 2,
        type: LeaderboardType.HIDDEN,
        tags: [],
        linear: true,
        stages: 5
      },
      {
        gamemode: Gamemode.RJ,
        gamemodeName: GamemodeInfo.get(Gamemode.RJ).name,
        allHidden: false,
        tier: 5,
        type: LeaderboardType.RANKED,
        tags: [],
        linear: true,
        stages: 5
      }
    ];
  }

  describe('getSpecificGroupedLeaderboard', () => {
    it('should find the correct leaderboard if it exists', () => {
      const lb = getSpecificGroupedLeaderboard(testLbs(), Gamemode.RJ);
      expect(lb).toBeDefined();
      expect(lb.gamemode).toBe(Gamemode.RJ);
    });

    it('should return undefined if leaderboard not found', () => {
      const lb = getSpecificGroupedLeaderboard(testLbs(), Gamemode.AHOP);
      expect(lb).toBeUndefined();
    });
  });

  describe('findMainGamemodeIndex', () => {
    it('should find a leaderboard based on mapname prefix if available', () => {
      expect(findMainGamemodeIndex(testLbs(), 'surf_the_dog')).toBe(3);
    });

    it('should find first ranked leaderboard if no prefix exists', () => {
      expect(findMainGamemodeIndex(testLbs(), 'pls_play_this')).toBe(2);
    });

    it('should find first ranked leaderboard if no prefix exists for existing leaderboards', () => {
      expect(findMainGamemodeIndex(testLbs(), 'ahop_coast_improved')).toBe(2);
    });

    it('should find first unranked leaderboard if no prefix nor ranked leaderboard exists', () => {
      const lbs = testLbs().map((lb) => {
        if (lb.type === LeaderboardType.RANKED)
          lb.type = LeaderboardType.HIDDEN;
        return lb;
      });
      expect(findMainGamemodeIndex(lbs, 'mr_blobby_horrorhouse')).toBe(1);
    });

    it('should default to 0 when no prefix, no ranked, no unranked maintrack', () => {
      const lbs = testLbs().map((lb) => {
        if (
          lb.type === LeaderboardType.RANKED ||
          lb.type === LeaderboardType.UNRANKED
        )
          lb.type = LeaderboardType.HIDDEN;
        return lb;
      });
      expect(findMainGamemodeIndex(lbs, 'twas_a_thrupence')).toBe(0);
    });
  });
});
