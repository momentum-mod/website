import { Gamemode, TrackType } from '@momentum/constants';
import { ZonesStub } from '@momentum/formats/zone';
import * as LeaderboardHandler from './leaderboard-handler.util';

describe('LeaderboardHandler', () => {
  describe('getCompatibleSuggestions', () => {
    it('should expand an array of suggestions to everything compatible', () => {
      const zones = structuredClone(ZonesStub);

      const main = {
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 1
      };

      const bonus = {
        gamemode: Gamemode.BHOP,
        trackType: TrackType.BONUS,
        trackNum: 1
      };

      const leaderboards = LeaderboardHandler.getCompatibleLeaderboards(
        [main, bonus],
        zones
      );

      expect(leaderboards).toEqual(
        expect.arrayContaining([
          main,
          { ...main, gamemode: Gamemode.BHOP },
          bonus,
          { ...bonus, gamemode: Gamemode.AHOP },
          { ...bonus, gamemode: Gamemode.BHOP }
        ])
      );

      // Surf is never compatible with Ahop
      expect(leaderboards).not.toContainEqual({
        ...main,
        gamemode: Gamemode.SURF
      });
    });

    it('should ignore non-defrag bonuses in defrag with defragModifiers', () => {
      const zones = structuredClone(ZonesStub);

      const main = {
        gamemode: Gamemode.DEFRAG_CPM,
        trackType: TrackType.MAIN,
        trackNum: 1
      };

      const bonus1 = {
        gamemode: Gamemode.DEFRAG_CPM,
        trackType: TrackType.BONUS,
        trackNum: 1
      };

      const bonus2 = {
        gamemode: Gamemode.DEFRAG_CPM,
        trackType: TrackType.BONUS,
        trackNum: 2
      };

      zones.tracks.bonuses.push({
        ...zones.tracks.bonuses[0],
        defragModifiers: 1
      });

      const leaderboards = LeaderboardHandler.getCompatibleLeaderboards(
        [main, bonus1, bonus2],
        zones
      );

      expect(leaderboards).toEqual(
        expect.arrayContaining([
          main,
          { ...main, gamemode: Gamemode.AHOP },
          bonus1,
          { ...bonus1, gamemode: Gamemode.AHOP },
          bonus2
        ])
      );

      expect(leaderboards).not.toContainEqual({
        ...bonus2,
        gamemode: Gamemode.AHOP
      });
    });
  });

  describe('getStageLeaderboard', () => {
    it('should return stage leaderboards', () => {
      expect(
        LeaderboardHandler['getStageLeaderboards'](
          [
            { gamemode: Gamemode.AHOP, trackType: TrackType.MAIN, trackNum: 1 },
            {
              gamemode: Gamemode.BHOP,
              trackType: TrackType.BONUS,
              trackNum: 1
            },
            { gamemode: Gamemode.BHOP, trackType: TrackType.MAIN, trackNum: 1 }
          ],
          ZonesStub
        )
      ).toMatchObject([
        { gamemode: Gamemode.AHOP, trackType: TrackType.STAGE, trackNum: 1 },
        { gamemode: Gamemode.AHOP, trackType: TrackType.STAGE, trackNum: 2 },
        { gamemode: Gamemode.BHOP, trackType: TrackType.STAGE, trackNum: 1 },
        { gamemode: Gamemode.BHOP, trackType: TrackType.STAGE, trackNum: 2 }
      ]);
    });

    it('should return an empty array if there is only one stage', () => {
      const zones = structuredClone(ZonesStub);
      zones.tracks.main.zones.segments = [zones.tracks.main.zones.segments[0]];
      expect(
        LeaderboardHandler['getStageLeaderboards'](
          [{ gamemode: Gamemode.AHOP, trackType: TrackType.MAIN, trackNum: 1 }],
          zones
        )
      ).toEqual([]);
    });
  });
});
