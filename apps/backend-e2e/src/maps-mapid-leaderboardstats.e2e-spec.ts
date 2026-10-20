import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin

import { Gamemode, TrackType, Style } from '@momentum/constants';
import { LeaderboardStatsDto } from '../../backend/src/app/dto/run/leaderboard-stats.dto';
import { req, db, registerE2ETestFile } from './support/test-environment';

describe('Maps Part 2', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/leaderboardStats', () => {
    describe('GET', () => {
      let user, token, map;
      before(async () => {
        [user, token] = await db.createAndLoginUser();
        map = await db.createMapWithFullLeaderboards();
        await db.createLbRun({
          map,
          user,
          trackType: TrackType.MAIN,
          trackNum: 1,
          style: Style.NORMAL,
          gamemode: Gamemode.AHOP
        });
      });

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

      it('should return leaderboard stats for a map', async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboardStats`,
          status: 200,
          validateArray: { type: LeaderboardStatsDto, length: 4 },
          token
        });

        for (const {
          leaderboard: { trackType, trackNum },
          totalRuns
        } of res.body) {
          if (trackType === TrackType.MAIN && trackNum === 1) {
            assert.equal(totalRuns, 1);
          } else {
            assert.equal(totalRuns, 0);
          }
        }
      });
    });
  });
});
