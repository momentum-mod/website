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
import { Gamemode, Role, runPath } from '@momentum/constants';
import {
  app,
  req,
  db,
  auth,
  fileStore,
  valkey,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/maps/{mapID}/leaderboard/runDownload', () => {
    describe('GET', () => {
      let admin, adminToken, adminGameToken, modToken, userToken, u1, map, run;
      const replay = Buffer.from('replay');

      before(async () => {
        [[admin, adminToken], modToken, [u1, userToken], map] =
          await Promise.all([
            db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.MODERATOR } }),
            db.createAndLoginUser(),
            db.createMapWithFullLeaderboards()
          ]);
        adminGameToken = auth.gameLogin(admin);

        run = await db.createLbRun({ map, user: u1, time: 1 });
        await fileStore.add(runPath(run.replayHash), replay);
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

      it('should return a URL to download the replay', async () => {
        const res = await req.get({
          url: `admin/maps/${map.id}/leaderboard/runDownload`,
          status: 200,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          validate: RunDownloadUrlDto,
          token: adminToken
        });

        const download = await fetch(res.body.url);
        assert.equal(download.status, 200);
        assert.deepEqual(Buffer.from(await download.arrayBuffer()), replay);
      });

      it('should 404 if the run does not exist', async () => {
        await req.get({
          url: `admin/maps/${map.id}/leaderboard/runDownload`,
          status: 404,
          query: { gamemode: Gamemode.AHOP, userID: NULL_ID },
          token: adminToken
        });
      });

      it('should 404 if the map does not exist', async () => {
        await req.get({
          url: `admin/maps/${NULL_ID}/leaderboard/runDownload`,
          status: 404,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          token: adminToken
        });
      });

      it('should 403 for a moderator', async () => {
        await req.get({
          url: `admin/maps/${map.id}/leaderboard/runDownload`,
          status: 403,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          token: modToken
        });
      });

      it('should 403 for a regular user', async () => {
        await req.get({
          url: `admin/maps/${map.id}/leaderboard/runDownload`,
          status: 403,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          token: userToken
        });
      });

      it('should 403 when using a game token', async () => {
        await req.get({
          url: `admin/maps/${map.id}/leaderboard/runDownload`,
          status: 403,
          query: { gamemode: Gamemode.AHOP, userID: u1.id },
          token: adminGameToken
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest(
          `admin/maps/${map.id}/leaderboard/runDownload`,
          'get'
        ));

      describe('download limit', () => {
        let runsService: LeaderboardRunsService, key;

        before(() => {
          // The limit only applies in production, and E2E runs as test.
          runsService = app.get(LeaderboardRunsService);
          runsService['isProd'] = true;
          key = `${RUN_DOWNLOADS_VALKEY_KEY}:${admin.id}`;
        });

        after(async () => {
          runsService['isProd'] = false;
          await valkey.del(key);
        });

        it('should not be limited', async () => {
          const { ttl, limit } = Config.throttle.runDownload;
          await valkey.set(key, limit, 'EX', ttl);

          await req.get({
            url: `admin/maps/${map.id}/leaderboard/runDownload`,
            status: 200,
            query: { gamemode: Gamemode.AHOP, userID: u1.id },
            token: adminToken
          });

          assert.equal(await valkey.get(key), String(limit));
        });
      });
    });
  });
});
