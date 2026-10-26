import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { assertValidDto, NULL_ID, randomString } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin
import { MapCreditDto, UserDto } from '../../backend/src/app/dto';
import {
  ActivityType,
  MapCreditType,
  MapStatus,
  MAX_CREDITS_EXCEPT_TESTERS,
  Role
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { arrayFrom } from '@momentum/util-fn';
import {
  prisma,
  req,
  db,
  registerE2ETestFile,
  resetKillswitches
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/credits', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u3Token, map;

      before(async () => {
        [[u1, u1Token], u2, u3Token] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.loginNewUser()
        ]);
        map = await db.createMap({
          credits: {
            createMany: {
              data: [
                { userID: u1.id, type: MapCreditType.AUTHOR },
                { userID: u2.id, type: MapCreditType.SPECIAL_THANKS }
              ]
            }
          }
        });
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with the specified maps credits', async () => {
        const res = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          token: u1Token
        });

        for (const credit of res.body) assertValidDto(credit, MapCreditDto);
        assert.equal(res.body.length, 2);
      });

      it('should respond with the specified maps credits with the user expand parameter', async () => {
        const res = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          query: { expand: 'user' },
          token: u1Token
        });

        for (const credit of res.body) {
          assertValidDto(credit, MapCreditDto);
          assertValidDto(credit.user, UserDto);
        }
      });

      it('should return an empty array when no map credits found', async () => {
        const map = await db.createMap();

        const res = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          token: u1Token
        });

        assert.ok(res.body instanceof Array);
        assert.equal(res.body.length, 0);
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/credits`,
          status: 403,
          token: u3Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return 404 when the map does not exist', async () => {
        await req.get({
          url: `maps/${NULL_ID}/credits`,
          status: 404,
          token: u1Token
        });
      });
    });

    describe('PUT', () => {
      let u1,
        u1Token,
        u2,
        u2Token,
        u3,
        u4,
        adminToken,
        modToken,
        map,
        newMapCredit;

      beforeEach(async () => {
        [u1, u1Token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        [u2, u2Token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        u3 = await db.createUser();
        u4 = await db.createUser();
        adminToken = await db.loginNewUser({ data: { roles: Role.ADMIN } });
        modToken = await db.loginNewUser({ data: { roles: Role.MODERATOR } });
        map = await db.createMap({
          submitter: { connect: { id: u1.id } },
          status: MapStatus.PRIVATE_TESTING
        });
        newMapCredit = [
          {
            type: MapCreditType.AUTHOR,
            userID: u2.id,
            description: 'My hairdresser'
          }
        ];
      });

      afterEach(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should create a map credit', async () => {
        const res = await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, [
          {
            userID: u2.id,
            mapID: map.id,
            user: { id: u2.id } // Check we include the user
          }
        ]);

        const credit = await prisma.mapCredit.findFirst();
        assert.partialDeepStrictEqual(credit, { userID: u2.id, mapID: map.id });
      });

      it('should 503 if killswitch guard is active for maps/{mapID}/credits PUT', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_SUBMISSION: true
          },
          token: adminToken
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 503,
          body: newMapCredit,
          token: u1Token
        });

        await resetKillswitches();
      });

      it('should delete an credits for the map not on the new DTO', async () => {
        await prisma.mapCredit.create({
          data: { type: MapCreditType.AUTHOR, userID: u1.id, mapID: map.id }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [{ type: MapCreditType.AUTHOR, userID: u2.id }],
          validateArray: MapCreditDto,
          token: u1Token
        });

        const credits = await prisma.mapCredit.findMany();
        assert.equal(credits.length, 1);
        assert.equal(credits[0].userID, u2.id);
      });

      it('should create multiple map credit and store in order', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [
            { userID: u4.id, type: MapCreditType.AUTHOR },
            { userID: u2.id, type: MapCreditType.AUTHOR },
            {
              userID: u3.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'Emotional support'
            },
            {
              userID: u1.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'Physical support'
            }
          ],
          validateArray: MapCreditDto,
          token: u1Token
        });

        const credits = await prisma.mapCredit.findMany();
        assert.partialDeepStrictEqual(credits, [
          { userID: u4.id, mapID: map.id },
          { userID: u2.id, mapID: map.id },
          { userID: u3.id, mapID: map.id },
          { userID: u1.id, mapID: map.id }
        ]);

        const got = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          token: u1Token
        });

        assert.equal(got.body[0].userID, u4.id);
        assert.equal(got.body[1].userID, u2.id);
        assert.equal(got.body[2].userID, u3.id);
        assert.equal(got.body[3].userID, u1.id);
      });

      // Exact same as above but we swap the order of the body, just to check
      // that that affects what order the results are fetched in
      it('should create multiple map credit and store in order part 2', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [
            { userID: u1.id, type: MapCreditType.AUTHOR },
            { userID: u2.id, type: MapCreditType.AUTHOR },
            {
              userID: u3.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'Culinary support'
            },
            {
              userID: u4.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'Legal support'
            }
          ],
          validateArray: MapCreditDto,
          token: u1Token
        });

        const credits = await prisma.mapCredit.findMany();
        assert.partialDeepStrictEqual(credits, [
          { userID: u1.id, mapID: map.id },
          { userID: u2.id, mapID: map.id },
          { userID: u3.id, mapID: map.id },
          { userID: u4.id, mapID: map.id }
        ]);

        const got = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          token: u1Token
        });

        assert.equal(got.body[0].userID, u1.id);
        assert.equal(got.body[1].userID, u2.id);
        assert.equal(got.body[2].userID, u3.id);
        assert.equal(got.body[3].userID, u4.id);
      });

      it('should 409 if the request contains duplicate credits', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 409,
          body: [...newMapCredit, ...newMapCredit],
          token: u1Token
        });
      });

      it('should create an activity if a new author is added', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [{ type: MapCreditType.AUTHOR, userID: u2.id }],
          token: u1Token
        });

        const activity = await prisma.activity.findFirst();
        assert.partialDeepStrictEqual(activity, {
          data: BigInt(map.id),
          userID: u2.id,
          type: ActivityType.MAP_UPLOADED
        });
      });

      it('should remove activity if an author is removed', async () => {
        await prisma.activity.create({
          data: { type: ActivityType.MAP_UPLOADED, data: map.id, userID: u2.id }
        });
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [{ type: MapCreditType.AUTHOR, userID: u1.id }],
          token: u1Token
        });

        const activity = await prisma.activity.findFirst();
        assert.partialDeepStrictEqual(activity, {
          data: BigInt(map.id),
          userID: u2.id,
          type: ActivityType.MAP_UPLOADED
        });
      });

      it('should allow an admin to create a credit', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: adminToken
        });
      });

      it('should allow an admin to update a credit even if the map is not in submission', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: adminToken
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });
      });

      it('should allow a mod to create a credit', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: modToken
        });
      });

      it('should allow a mod to update the credit even if the map is not in submission', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: modToken
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });
      });

      it('should 404 if the map is not found', async () => {
        await req.post({
          url: `maps/${NULL_ID}/credits`,
          status: 404,
          body: newMapCredit,
          token: u1Token
        });
      });

      it('should 403 if the user is not the map submitter', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 403,
          body: newMapCredit,
          token: u2Token
        });
      });

      it('should 400 if the map credit object is invalid', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: { type: -6, userID: u1.id }, // Endpoint only takes arrays!
          token: u1Token
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ type: -6, userID: u1.id }],
          token: u1Token
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ type: MapCreditType.AUTHOR, userID: 'Bono' }],
          token: u1Token
        });
      });

      it('should 400 if a user ID is missing on a credit', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ type: MapCreditType.TESTER }],
          token: u1Token
        });
      });

      it('should 400 if a type is missing on a credit', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ userID: u2.id }],
          token: u1Token
        });
      });

      it('should 400 if theres no AUTHOR credits', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ userID: u2.id, type: MapCreditType.TESTER }],
          token: u1Token
        });
      });

      it('should allow if no AUTHOR credits if has a AUTHOR placeholder suggestion', async () => {
        await prisma.mapSubmission.update({
          where: { mapID: map.id },
          data: {
            placeholders: [{ alias: 'Bozo', type: MapCreditType.AUTHOR }]
          }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [{ userID: u2.id, type: MapCreditType.TESTER }],
          token: u1Token
        });
      });

      it('should 400 if the description is too long', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [
            {
              userID: u2.id,
              type: MapCreditType.AUTHOR,
              description:
                'Momentum Man; The fabled master of every gamemode, with more records than ever seen. Scientist, lover, Source movement legend. But how did he die? Follow in his footsteps, unlock the mystery.'
            }
          ],
          token: u1Token
        });
      });

      for (const [term, forbidden] of [
        ['regular user', [MapStatus.DISABLED, MapStatus.APPROVED]],
        ['moderator', []],
        ['admin', []]
      ]) {
        for (const status of Enum.values(MapStatus)) {
          const allow = !(forbidden as MapStatus[]).includes(status);

          it(`should ${
            allow ? 'allow' : 'reject'
          } a ${term} if map has status of ${MapStatus[status]}`, async () => {
            await prisma.mMap.update({
              where: { id: map.id },
              data: { status }
            });

            // Can't store tokens in above tuple as they're only known during test
            // executions.
            const token =
              term == 'moderator'
                ? modToken
                : term == 'admin'
                  ? adminToken
                  : u1Token;

            await req.put({
              url: `maps/${map.id}/credits`,
              status: allow ? 201 : 403,
              body: [{ userID: u2.id, type: MapCreditType.AUTHOR }],
              token
            });

            await prisma.mMap.update({
              where: { id: map.id },
              data: { status: MapStatus.APPROVED }
            });
          });
        }
      }

      for (const type of [
        MapCreditType.AUTHOR,
        MapCreditType.CONTRIBUTOR,
        MapCreditType.SPECIAL_THANKS
      ]) {
        it(`should 400 if there are more than ${MAX_CREDITS_EXCEPT_TESTERS} ${MapCreditType[type]} credits`, async () => {
          const userIDs = await db
            .createUsers(MAX_CREDITS_EXCEPT_TESTERS + 1)
            .then((users) => users.map(({ id }) => id));
          await req.put({
            url: `maps/${map.id}/credits`,
            status: 400,
            // Too long to create > 20 users, this check hits earlier than user existence. allow it
            body: userIDs.map((userID) => ({ userID, type })),
            token: u1Token
          });
        });

        it(`should 400 if there are more than ${MAX_CREDITS_EXCEPT_TESTERS} ${MapCreditType[type]} credits or placeholders`, async () => {
          await prisma.mapSubmission.update({
            where: { mapID: map.id },
            data: {
              placeholders: arrayFrom(MAX_CREDITS_EXCEPT_TESTERS - 4, () => ({
                alias: randomString(),
                type
              }))
            }
          });

          const userIDs = await db
            .createUsers(5)
            .then((users) => users.map(({ id }) => id));
          await req.put({
            url: `maps/${map.id}/credits`,
            status: 400,
            body: userIDs.map((userID) => ({ userID, type })),
            token: u1Token
          });
        });
      }

      it('should 400 if the credited user does not exist', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: { type: MapCreditType.AUTHOR, userID: NULL_ID },
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest(`maps/${map.id}/credits`, 'put');
      });
    });
  });
});
