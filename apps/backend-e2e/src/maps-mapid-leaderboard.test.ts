import { mock, after, before, describe, it } from 'node:test';
import {
  assertValidDto,
  futureDateOffset,
  NULL_ID
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import { LeaderboardRunDto } from '../../backend/src/app/dto';
import { Gamemode, MapStatus, TrackType, Style } from '@momentum/constants';
import { arrayFrom } from '@momentum/util-fn';
import {
  app,
  prisma,
  req,
  db,
  auth,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/leaderboard', () => {
    describe('GET', () => {
      let u1, token, u2, u3, map;

      before(async () => {
        [[u1, token], u2, u3, map] = await Promise.all([
          db.createAndLoginUser({
            data: { steamID: BigInt(Number.MAX_SAFE_INTEGER) * 2n }
          }),
          db.createUser(),
          db.createUser(),
          db.createMapWithFullLeaderboards() // Creates a bunch of ahop leaderboards
        ]);

        await db.createLbRun({
          map: map,
          user: u1,
          time: 10,
          createdAt: futureDateOffset(3)
        });

        await db.createLbRun({
          map: map,
          user: u2,
          time: 20,
          createdAt: futureDateOffset(2)
        });

        await db.createLbRun({
          map: map,
          user: u3,
          time: 30,
          flags: [1],
          createdAt: futureDateOffset(1)
        });

        await db.createLbRun({
          map: map,
          user: u1,
          time: 1,
          trackType: TrackType.STAGE,
          trackNum: 1,
          style: Style.NORMAL,
          createdAt: futureDateOffset(1)
        });
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

      it("should return a list of a leaderboard's runs", async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard`,
          status: 200,
          query: { gamemode: Gamemode.AHOP },
          validatePaged: { type: LeaderboardRunDto, count: 3 },
          token
        });

        for (const item of res.body.data) {
          assert.ok(Object.hasOwn(item, 'user'));
          assert.ok(Object.hasOwn(item, 'downloadURL'));
          assert.ok(!Object.hasOwn(item, 'splits'));
        }
      });

      it("should return a list of a leaderboard's runs for a non-default trackType/Num", async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard`,
          status: 200,
          query: {
            gamemode: Gamemode.AHOP,
            trackType: TrackType.STAGE,
            trackNum: 1
          },
          validatePaged: { type: LeaderboardRunDto, count: 1 },
          token
        });
      });

      it('should 400 if missing a gamemode', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard`,
          status: 400,
          token
        });
      });

      it('should be ordered by rank', async () => {
        await req.sortTest({
          url: `maps/${map.id}/leaderboard`,
          validate: LeaderboardRunDto,
          query: { gamemode: Gamemode.AHOP },
          sortFn: (a, b) => a.time - b.time,
          token
        });
      });

      it('should respond with filtered map data using the skip parameter', async () => {
        await req.skipTest({
          url: `maps/${map.id}/leaderboard`,
          query: { gamemode: Gamemode.AHOP },
          validate: LeaderboardRunDto,
          token
        });
      });

      it('should respond with filtered map data using the take parameter', async () => {
        await req.takeTest({
          url: `maps/${map.id}/leaderboard`,
          query: { gamemode: Gamemode.AHOP },
          validate: LeaderboardRunDto,
          token
        });
      });

      it('should respond with filtered runs given using the userIDs param', async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard`,
          query: {
            gamemode: Gamemode.AHOP,
            userIDs: `${u1.id},${u3.id}`
          },
          validatePaged: { type: LeaderboardRunDto, count: 2 },
          token
        });

        assert.equal(res.body.data[0].userID, u1.id);
        assert.equal(res.body.data[1].userID, u3.id);
      });

      it('should respond with filtered runs given using the steamIDs param', async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard`,
          query: {
            gamemode: Gamemode.AHOP,
            steamIDs: `${u1.steamID},${u3.steamID}`
          },
          validatePaged: { type: LeaderboardRunDto, count: 2 },
          token
        });

        assert.equal(res.body.data[0].userID, u1.id);
        assert.equal(res.body.data[1].userID, u3.id);
      });

      // Test that permissions checks are getting called
      // Yes, u1 has runs on the map, but we don't actually test for that
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/leaderboard`,
          query: { gamemode: Gamemode.AHOP },
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return 404 for a nonexistent map', async () => {
        await req.get({
          url: `maps/${NULL_ID}/leaderboard`,
          query: { gamemode: Gamemode.AHOP },
          status: 404,
          token
        });
      });
    });

    describe("GET - 'around' filter", () => {
      let map, u7, u7Token, runs;

      before(async () => {
        map = await db.createMap();
        runs = await Promise.all(
          arrayFrom(20, (i) =>
            db.createLbRun({ map: map, time: (i + 1) * 100 })
          )
        );
        u7 = runs[6].user;
        u7Token = auth.login(u7);
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

      it('should return a list of ranks around your rank', async () => {
        const res = await req.get({
          url: `maps/${map.id}/leaderboard`,
          query: { gamemode: Gamemode.AHOP, filter: 'around', take: 8 },
          status: 200,
          token: u7Token,
          validatePaged: { type: LeaderboardRunDto, returnCount: 9 }
        });

        // We're calling as user 7, taking 4 on each side, so we expect ranks
        // 3, 4, 5, 6, our rank, 8, 9, 10, 11
        let rankIndex = 3;
        for (const rank of res.body.data) {
          assertValidDto(rank, LeaderboardRunDto);
          assert.equal(rank.rank, rankIndex);
          rankIndex++;
        }
        // Last tested was 11, then incremented once more, should be sitting on
        // 12.
        assert.equal(rankIndex, 12);
      });

      it('should 401 when no access token is provided', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard`,
          query: { gamemode: Gamemode.AHOP, filter: 'around' },
          status: 401
        });
      });
    });

    describe("GET - 'friends' filter", () => {
      const mockSteamIDs: bigint[] = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n];
      let map, user, token, steamService: SteamService;

      before(async () => {
        steamService = app.get(SteamService);
        [[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]);
        const friends = await Promise.all(
          mockSteamIDs.map((steamID) => db.createUser({ data: { steamID } }))
        );

        // Make our user rank 1, friends have subsequent ranks 2-11.
        for (const [i, user] of friends.entries())
          await db.createLbRun({
            map: map,
            user: user,
            time: (i + 2) * 1000
          });

        await db.createLbRun({
          user: user,
          map: map,
          time: 1
        });
      });

      it("should return a list of the user's Steam friend's ranks", async () => {
        // Mock the call to Steam's API
        mock
          .method(steamService, 'getSteamFriends')
          .mock.mockImplementationOnce(async () =>
            mockSteamIDs.map((id) => ({
              steamid: id.toString(),
              relationship: 'friend',
              friend_since: 0
            }))
          );

        const res = await req.get({
          url: `maps/${map.id}/leaderboard`,
          query: { gamemode: Gamemode.AHOP, filter: 'friends' },
          status: 200,
          token,
          validatePaged: { type: LeaderboardRunDto, count: 10 }
        });

        for (const run of res.body.data)
          assert.ok(mockSteamIDs.includes(BigInt(run.user.steamID)));
      });

      it('should 410 if the user has no Steam friends', async () => {
        mock
          .method(steamService, 'getSteamFriends')
          .mock.mockImplementationOnce(async () => []);

        await req.get({
          url: `maps/${map.id}/leaderboard`,
          query: { gamemode: Gamemode.AHOP, filter: 'friends' },
          status: 410,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.get({
          url: `maps/${map.id}/leaderboard`,
          query: { gamemode: Gamemode.AHOP, filter: 'friends' },
          status: 401
        });
      });
    });
  });
});
