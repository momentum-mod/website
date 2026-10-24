import * as assert from 'node:assert/strict';
import { describe, it, afterEach, mock } from 'node:test';
import { includesPartial } from '@momentum/test-utils';
import {
  Gamemode,
  DisabledGamemodes,
  TrackType,
  Style
} from '@momentum/constants';
import { ZonesStub } from '@momentum/formats/zone';
import * as LeaderboardHandler from './leaderboard-handler.util';

describe('LeaderboardHandler', () => {
  afterEach(() => mock.restoreAll());

  describe('getCompatibleSuggestions', () => {
    it('should expand an array of suggestions to everything compatible', () => {
      const zones = structuredClone(ZonesStub);

      const main = {
        gamemode: Gamemode.BHOP,
        trackType: TrackType.MAIN,
        trackNum: 1,
        style: Style.NORMAL
      };

      const bonus = {
        gamemode: Gamemode.AHOP,
        trackType: TrackType.BONUS,
        trackNum: 1,
        style: Style.NORMAL
      };

      mock.method(DisabledGamemodes, 'has').mock.mockImplementation((key) => {
        return key === Gamemode.CONC;
      });

      const leaderboards = LeaderboardHandler.getCompatibleLeaderboards(
        [main, bonus],
        zones
      );

      assert.ok(
        includesPartial(leaderboards, [
          main,
          { ...main, gamemode: Gamemode.BHOP },
          bonus,
          { ...bonus, gamemode: Gamemode.AHOP },
          { ...bonus, gamemode: Gamemode.BHOP }
        ])
      );

      // Disabled gamemodes: Fuck conc
      assert.ok(
        !includesPartial(leaderboards, [
          {
            ...main,
            gamemode: Gamemode.CONC
          }
        ])
      );
    });

    it('should ignore non-defrag bonuses in defrag with defragModifiers', () => {
      const zones = structuredClone(ZonesStub);

      const main = {
        gamemode: Gamemode.DEFRAG_CPM,
        trackType: TrackType.MAIN,
        trackNum: 1,
        style: Style.NORMAL
      };

      const bonus1 = {
        gamemode: Gamemode.DEFRAG_CPM,
        trackType: TrackType.BONUS,
        trackNum: 1,
        style: Style.NORMAL
      };

      const bonus2 = {
        gamemode: Gamemode.DEFRAG_CPM,
        trackType: TrackType.BONUS,
        trackNum: 2,
        style: Style.NORMAL
      };

      zones.tracks.bonuses.push({
        ...zones.tracks.bonuses[0],
        defragModifiers: 1
      });

      const leaderboards = LeaderboardHandler.getCompatibleLeaderboards(
        [main, bonus1, bonus2],
        zones
      );

      assert.ok(
        includesPartial(leaderboards, [
          main,
          { ...main, gamemode: Gamemode.AHOP },
          bonus1,
          { ...bonus1, gamemode: Gamemode.AHOP },
          bonus2
        ])
      );

      assert.ok(
        !includesPartial(leaderboards, [
          {
            ...bonus2,
            gamemode: Gamemode.AHOP
          }
        ])
      );
    });
  });

  describe('getStageLeaderboard', () => {
    it('should return stage leaderboards', () => {
      assert.partialDeepStrictEqual(
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
        ),
        [
          { gamemode: Gamemode.AHOP, trackType: TrackType.STAGE, trackNum: 1 },
          { gamemode: Gamemode.AHOP, trackType: TrackType.STAGE, trackNum: 2 },
          { gamemode: Gamemode.BHOP, trackType: TrackType.STAGE, trackNum: 1 },
          { gamemode: Gamemode.BHOP, trackType: TrackType.STAGE, trackNum: 2 }
        ]
      );
    });

    it('should return an empty array if there is only one stage', () => {
      const zones = structuredClone(ZonesStub);
      zones.tracks.main.zones.segments = [zones.tracks.main.zones.segments[0]];
      assert.deepStrictEqual(
        LeaderboardHandler['getStageLeaderboards'](
          [{ gamemode: Gamemode.AHOP, trackType: TrackType.MAIN, trackNum: 1 }],
          zones
        ),
        []
      );
    });
  });
});
