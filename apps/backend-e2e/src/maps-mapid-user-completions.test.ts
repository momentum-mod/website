import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { matchesPartial, NULL_ID } from '@momentum/test-utils';
import { MapCompletionDto } from '../../backend/src/app/dto';
import {
  Gamemode,
  LeaderboardType,
  Style,
  TrackType
} from '@momentum/constants';
import { arrayFrom } from '@momentum/util-fn';
import { req, db, registerE2ETestFile } from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/user-completions', () => {
    describe('GET', () => {
      let u1, token, others, map;

      before(async () => {
        [[u1, token], ...others] = await Promise.all([
          db.createAndLoginUser(),
          ...arrayFrom(10, () => db.createUser())
        ]);

        // Main track + two stages + a ranked bonus + an unranked bonus, all
        // AHOP/Normal. Stages don't have tiers.
        map = await db.createMap({
          leaderboards: {
            createMany: {
              data: [
                {
                  gamemode: Gamemode.AHOP,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  style: Style.NORMAL,
                  tier: 2,
                  linear: true,
                  type: LeaderboardType.RANKED
                },
                {
                  gamemode: Gamemode.AHOP,
                  trackType: TrackType.STAGE,
                  trackNum: 1,
                  style: Style.NORMAL,
                  type: LeaderboardType.RANKED
                },
                {
                  gamemode: Gamemode.AHOP,
                  trackType: TrackType.STAGE,
                  trackNum: 2,
                  style: Style.NORMAL,
                  type: LeaderboardType.RANKED
                },
                {
                  gamemode: Gamemode.AHOP,
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  style: Style.NORMAL,
                  tier: 4,
                  type: LeaderboardType.RANKED
                },
                {
                  gamemode: Gamemode.AHOP,
                  trackType: TrackType.BONUS,
                  trackNum: 2,
                  style: Style.NORMAL,
                  tier: 3,
                  type: LeaderboardType.UNRANKED
                }
              ]
            }
          }
        });

        // Times are all distinct so ranks are deterministic regardless of order.
        await Promise.all([
          // Main track: u1 is WR (rank 1), 3 completions.
          db.createLbRun({ map, user: u1, time: 5 }),
          db.createLbRun({ map, user: others[0], time: 10 }),
          db.createLbRun({ map, user: others[1], time: 15 }),

          // Stage 1: u1 is rank 2 (Top10), 2 completions.
          db.createLbRun({
            map,
            user: others[0],
            time: 5,
            trackType: TrackType.STAGE,
            trackNum: 1
          }),
          db.createLbRun({
            map,
            user: u1,
            time: 10,
            trackType: TrackType.STAGE,
            trackNum: 1
          }),

          // Stage 2: u1 has not completed, 1 completion by someone else.
          db.createLbRun({
            map,
            user: others[0],
            time: 5,
            trackType: TrackType.STAGE,
            trackNum: 2
          }),

          // Bonus 1: 10 faster runs, u1 is rank 11 -> a numbered group.
          ...others.map((user, i) =>
            db.createLbRun({
              map,
              user,
              time: i + 1,
              trackType: TrackType.BONUS,
              trackNum: 1
            })
          ),
          db.createLbRun({
            map,
            user: u1,
            time: 11,
            trackType: TrackType.BONUS,
            trackNum: 1
          }),

          // Bonus 2 (unranked): u1 is the only completion (WR).
          db.createLbRun({
            map,
            user: u1,
            time: 5,
            trackType: TrackType.BONUS,
            trackNum: 2
          })
        ]);
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

      it("should return the user's completion status for every track on a map", async () => {
        const res = await req.get({
          url: `maps/${map.id}/user-completions`,
          status: 200,
          query: { gamemode: Gamemode.AHOP },
          validateArray: { type: MapCompletionDto, length: 5 },
          token
        });

        const body = res.body as MapCompletionDto[];
        const find = (trackType: TrackType, trackNum: number) =>
          body.find(
            (e) => e.trackType === trackType && e.trackNum === trackNum
          );

        // Main track: WR (rank 1). Tier, PB time, and the completion group are not
        // returned by this endpoint - the game/front end derive those.
        assert.ok(
          matchesPartial(find(TrackType.MAIN, 1), {
            totalCompletions: 3,
            rank: 1
          })
        );
        assert.ok(!Object.hasOwn(find(TrackType.MAIN, 1), 'tier'));
        assert.ok(!Object.hasOwn(find(TrackType.MAIN, 1), 'time'));
        assert.ok(!Object.hasOwn(find(TrackType.MAIN, 1), 'group'));

        // Stage 1: rank 2
        assert.ok(
          matchesPartial(find(TrackType.STAGE, 1), {
            totalCompletions: 2,
            rank: 2
          })
        );

        // Stage 2: not completed by u1 (completion inferred from null rank)
        assert.ok(
          matchesPartial(find(TrackType.STAGE, 2), {
            totalCompletions: 1,
            rank: null
          })
        );

        // Bonus 1: rank 11
        assert.ok(
          matchesPartial(find(TrackType.BONUS, 1), {
            totalCompletions: 11,
            rank: 11
          })
        );

        // Bonus 2: the unranked track is still included
        assert.ok(
          matchesPartial(find(TrackType.BONUS, 2), {
            totalCompletions: 1,
            rank: 1
          })
        );
      });

      it('should order entries by trackType then trackNum', async () => {
        const res = await req.get({
          url: `maps/${map.id}/user-completions`,
          status: 200,
          query: { gamemode: Gamemode.AHOP },
          token
        });

        assert.deepEqual(
          (res.body as MapCompletionDto[]).map((e) => [
            e.trackType,
            e.trackNum
          ]),
          [
            [TrackType.MAIN, 1],
            [TrackType.STAGE, 1],
            [TrackType.STAGE, 2],
            [TrackType.BONUS, 1],
            [TrackType.BONUS, 2]
          ]
        );
      });

      it('should return an empty array for a gamemode the map has no leaderboards for', async () => {
        await req.get({
          url: `maps/${map.id}/user-completions`,
          status: 200,
          query: { gamemode: Gamemode.BHOP },
          validateArray: { type: MapCompletionDto, length: 0 },
          token
        });
      });

      it('should 400 if not given a gamemode', async () => {
        await req.get({
          url: `maps/${map.id}/user-completions`,
          status: 400,
          token
        });
      });

      it('should 404 if the map does not exist', async () => {
        await req.get({
          url: `maps/${NULL_ID}/user-completions`,
          status: 404,
          query: { gamemode: Gamemode.AHOP },
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest(`maps/${map.id}/user-completions`, 'get');
      });
    });
  });
});
