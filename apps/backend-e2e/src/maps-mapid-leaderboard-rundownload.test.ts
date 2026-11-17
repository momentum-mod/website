import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin
import { RunDownloadUrlDto } from '../../backend/src/app/dto';
import { Config } from '../../backend/src/app/config';
import {
  LeaderboardRunsService,
  RUN_DOWNLOADS_VALKEY_KEY
} from '../../backend/src/app/modules/runs/leaderboard-runs.service';
import { Gamemode, MapStatus, runPath } from '@momentum/constants';
import {
  app,
  prisma,
  req,
  db,
  fileStore,
  valkey,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/leaderboard/runDownload', () => {
    describe('GET', () => {
      let u1, token, webToken, u2, map, run1, run2;
      const replay1 = Buffer.from('replay one');
      const replay2 = Buffer.from('replay two');

      before(async () => {
        [[u1, token], u2, map] = await Promise.all([
          db.createAndLoginGameUser(),
          db.createUser(),
          db.createMapWithFullLeaderboards()
        ]);
        webToken = await db.loginNewUser();

        [run1, run2] = await Promise.all([
          db.createLbRun({ map, user: u1, time: 1 }),
          db.createLbRun({ map, user: u2, time: 2 })
        ]);

        await Promise.all([
          fileStore.add(runPath(run1.replayHash), replay1),
          fileStore.add(runPath(run2.replayHash), replay2)
        ]);
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

      async function download(url: string): Promise<Buffer> {
        const res = await fetch(url);
        assert.equal(res.status, 200);
        return Buffer.from(await res.arrayBuffer());
      }

      it('should return a URL to download the replay for a userID', async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard/runDownload`,
          status: 200,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          validate: RunDownloadUrlDto,
          token
        });

        assert.deepEqual(await download(res.body.url), replay1);
      });

      it("should return a URL to download another user's replay", async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard/runDownload`,
          status: 200,
          query: { gamemode: Gamemode.AHOP, userID: u2.id },
          validate: RunDownloadUrlDto,
          token
        });

        assert.deepEqual(await download(res.body.url), replay2);
      });

      it('should 400 if not given a userID', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard/runDownload`,
          status: 400,
          query: { gamemode: Gamemode.AHOP },
          token
        });
      });

      it('should 400 if given a rank', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard/runDownload`,
          status: 400,
          query: { gamemode: Gamemode.AHOP, userID: u1.id, rank: 1 },
          token
        });
      });

      it('should 400 if given an expand', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard/runDownload`,
          status: 400,
          query: { gamemode: Gamemode.AHOP, userID: u1.id, expand: 'splits' },
          token
        });
      });

      it('should 404 if the run does not exist', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard/runDownload`,
          status: 404,
          query: { gamemode: Gamemode.AHOP, userID: NULL_ID },
          token
        });
      });

      it('should 404 if the map does not exist', async () => {
        await req.get({
          url: `maps/${NULL_ID}/leaderboard/runDownload`,
          status: 404,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
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
          url: `maps/${map.id}/leaderboard/runDownload`,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should 403 when using a non-game token', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard/runDownload`,
          status: 403,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          token: webToken
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest(`maps/${map.id}/leaderboard/runDownload`, 'get'));

      describe('download limit', () => {
        const { ttl, limit } = Config.throttle.runDownload;
        let runsService: LeaderboardRunsService, u3, u3Token, key;

        before(async () => {
          // The limit only applies in production, and E2E runs as test.
          runsService = app.get(LeaderboardRunsService);
          runsService['isProd'] = true;

          [u3, u3Token] = await db.createAndLoginGameUser();
          key = `${RUN_DOWNLOADS_VALKEY_KEY}:${u3.id}`;
        });

        after(async () => {
          runsService['isProd'] = false;
          await valkey.del(key);
        });

        it("should count downloads against the user's limit", async () => {
          await req.get({
            url: `maps/${map.id}/leaderboard/runDownload`,
            status: 200,
            query: { gamemode: Gamemode.AHOP, userID: u1.id },
            token: u3Token
          });

          assert.equal(await valkey.get(key), '1');
          const keyTTL = await valkey.ttl(key);
          assert.ok(keyTTL > 0 && keyTTL <= ttl);

          await req.get({
            url: `maps/${map.id}/leaderboard/runDownload`,
            status: 200,
            query: { gamemode: Gamemode.AHOP, userID: u2.id },
            token: u3Token
          });

          assert.equal(await valkey.get(key), '2');
        });

        it('should not count requests for runs that do not exist', async () => {
          await req.get({
            url: `maps/${map.id}/leaderboard/runDownload`,
            status: 404,
            query: { gamemode: Gamemode.AHOP, userID: NULL_ID },
            token: u3Token
          });

          assert.equal(await valkey.get(key), '2');
        });

        it('should 429 once the user has exceeded their limit', async () => {
          await valkey.set(key, limit - 1, 'KEEPTTL');

          await req.get({
            url: `maps/${map.id}/leaderboard/runDownload`,
            status: 200,
            query: { gamemode: Gamemode.AHOP, userID: u1.id },
            token: u3Token
          });

          await req.get({
            url: `maps/${map.id}/leaderboard/runDownload`,
            status: 429,
            query: { gamemode: Gamemode.AHOP, userID: u1.id },
            token: u3Token
          });
        });

        it('should not affect other users', async () => {
          await req.get({
            url: `maps/${map.id}/leaderboard/runDownload`,
            status: 200,
            query: { gamemode: Gamemode.AHOP, userID: u1.id },
            token
          });
        });

        it('should allow downloads again once the TTL expires', async () => {
          await valkey.expire(key, 1);
          await new Promise((resolve) => setTimeout(resolve, 1100));

          await req.get({
            url: `maps/${map.id}/leaderboard/runDownload`,
            status: 200,
            query: { gamemode: Gamemode.AHOP, userID: u1.id },
            token: u3Token
          });

          assert.equal(await valkey.get(key), '1');
        });
      });
    });
  });
});
