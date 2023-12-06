import { Enum } from '@momentum/enum';
import {
  Gamemode,
  IncompatibleGamemodes,
  TrackType
} from '@momentum/constants';
import { ZonesStub } from '@momentum/formats/zone';
import { LeaderboardHandler } from './leaderboard-handler.util';

describe('LeaderboardHandler', () => {
  describe('getCompatibleSuggestions', () => {
    it('should expand an array of suggestions to everything compatible', () => {
      jest
        .spyOn(Enum, 'values')
        .mockReturnValue([Gamemode.AHOP, Gamemode.BHOP, Gamemode.SURF]);
      jest
        .spyOn(IncompatibleGamemodes, 'get')
        .mockImplementation((key) =>
          key === Gamemode.AHOP ? [Gamemode.BHOP] : []
        );

      const inMain = {
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 0
      };

      const outMain = {
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 0
      };

      const inBonus = {
        gamemode: Gamemode.BHOP,
        trackType: TrackType.BONUS,
        trackNum: 0
      };

      const outBonus = {
        gamemode: Gamemode.BHOP,
        trackType: TrackType.BONUS,
        trackNum: 0
      };

      expect(
        LeaderboardHandler.getCompatibleLeaderboards([inMain, inBonus])
      ).toEqual(
        expect.arrayContaining([
          outMain,
          { ...outMain, gamemode: Gamemode.SURF },
          outBonus,
          { ...outBonus, gamemode: Gamemode.AHOP },
          { ...outBonus, gamemode: Gamemode.SURF }
        ])
      );
    });
  });

  describe('getStageLeaderboardSuggestions', () => {
    it('should return stage leaderboard suggestions', () => {
      expect(
        LeaderboardHandler['getStageLeaderboards'](
          [
            { gamemode: Gamemode.AHOP, trackType: TrackType.MAIN, trackNum: 0 },
            {
              gamemode: Gamemode.BHOP,
              trackType: TrackType.BONUS,
              trackNum: 0
            },
            { gamemode: Gamemode.BHOP, trackType: TrackType.MAIN, trackNum: 0 }
          ],
          ZonesStub
        )
      ).toMatchObject([
        { gamemode: Gamemode.AHOP, trackType: TrackType.STAGE, trackNum: 0 },
        { gamemode: Gamemode.AHOP, trackType: TrackType.STAGE, trackNum: 1 },
        { gamemode: Gamemode.BHOP, trackType: TrackType.STAGE, trackNum: 0 },
        { gamemode: Gamemode.BHOP, trackType: TrackType.STAGE, trackNum: 1 }
      ]);
    });
  });
});
