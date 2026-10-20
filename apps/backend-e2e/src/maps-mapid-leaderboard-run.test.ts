import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin
import { LeaderboardRunDto } from '../../backend/src/app/dto';
import { Gamemode, MapStatus, TrackType } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/leaderboard/run', () => {
    describe('GET', () => {
      let u1, token, u2, map;

      before(async () => {
        [[u1, token], u2, map] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.createMapWithFullLeaderboards()
        ]);

        await db.createLbRun({
          map: map,
          user: u1,
          time: 1
        });

        await db.createLbRun({
          map: map,
          user: u2,
          time: 2
        });

        await db.createLbRun({
          map: map,
          user: u2,
          trackType: TrackType.STAGE,
          trackNum: 1,
          time: 2
        });
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

      it('should return a run for a specific userID', async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard/run`,
          status: 200,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          validate: LeaderboardRunDto,
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          rank: 1,
          mapID: map.id,
          userID: u1.id
        });
      });

      it('should return a run on a stage track', async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard/run`,
          status: 200,
          query: {
            gamemode: Gamemode.AHOP,
            userID: u2.id,
            trackType: TrackType.STAGE,
            trackNum: 1
          },
          validate: LeaderboardRunDto,
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          rank: 1,
          mapID: map.id,
          userID: u2.id
        });
      });

      it('should return a run for a specific rank', async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard/run`,
          status: 200,
          query: { gamemode: Gamemode.AHOP, rank: 2 },
          validate: LeaderboardRunDto,
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          rank: 2,
          mapID: map.id,
          userID: u2.id
        });
      });

      it('should 400 if given both userID and rank', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard/run`,
          status: 400,
          query: { gamemode: Gamemode.AHOP, rank: 1, userID: u1.id },
          token
        });
      });

      it('should 400 if given neither userID or rank', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard/run`,
          status: 400,
          query: { gamemode: Gamemode.AHOP },
          token
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/leaderboard/run`,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should 404 for a nonexistent map', async () => {
        await req.get({
          url: `maps/${NULL_ID}/leaderboard/run`,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          status: 404,
          token
        });
      });

      it('should 404 for a nonexistent rank', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard/${NULL_ID}/run`,
          status: 404,
          token
        });
      });
    });
  });
});
