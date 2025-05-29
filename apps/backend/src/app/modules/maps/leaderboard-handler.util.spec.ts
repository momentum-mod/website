import { Gamemode, TrackType } from '@momentum/constants';
import { ZonesStub } from '@momentum/formats/zone';
import * as LeaderboardHandler from './leaderboard-handler.util';

describe('LeaderboardHandler', () => {
  describe('getCompatibleSuggestions', () => {
    it('should expand an array of suggestions to everything compatible', () => {
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

      const leaderboards = LeaderboardHandler.getCompatibleLeaderboards([
        main,
        bonus
      ]);

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
