import {
  mock,
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it
} from 'node:test';

import {
  any,
  assertValidDto,
  AuthUtil,
  createSha1Hash,
  DbUtil,
  FILES_PATH,
  FileStoreUtil,
  futureDateOffset,
  matchesPartial,
  mockDiscordService,
  NULL_ID,
  randomString,
  RequestUtil,
  resetKillswitches,
  stringContaining
} from '@momentum/test-utils';

import * as assert from 'node:assert/strict';
// noinspection DuplicatedCode

// See auth.e2e-spec.ts for justification of this sin
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import { Config } from '../../backend/src/app/config';
import {
  LeaderboardRunDto,
  MapCreditDto,
  MapImageDto,
  MapInfoDto,
  MapReviewDto,
  UserDto
} from '../../backend/src/app/dto';
import { readFileSync } from 'node:fs';
import { MMap, PrismaClient, User } from '@momentum/db';

import {
  ActivityType,
  AdminActivityType,
  MapStatuses,
  Gamemode,
  MapCreditType,
  MapStatus,
  MapTestInviteState,
  MAX_CREDITS_EXCEPT_TESTERS,
  NotificationType,
  Role,
  TrackType,
  MapSubmissionType,
  Style
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { difference, arrayFrom } from '@momentum/util-fn';
import {
  validateZoneFile,
  ZonesStub,
  ZonesStubString
} from '@momentum/formats/zone';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { MapListVersionDto } from '../../backend/src/app/dto/map/map-list-version.dto';
import path from 'node:path';
import { LeaderboardStatsDto } from '../../backend/src/app/dto/run/leaderboard-stats.dto';
import * as rxjs from 'rxjs';

describe('Maps Part 2', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fileStore: FileStoreUtil,
    auth: AuthUtil;

  before(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    fileStore = env.fileStore;
    auth = env.auth;
  });

  after(async () => {
    await teardownE2ETestEnvironment(app, prisma);
  });

  describe('maps/maplist', () => {
    describe('GET', () => {
      let token;
      before(async () => {
        await (token = await db.loginNewUser());
      });
      after(async () => {
        await db.cleanup('user');
      });

      it('should respond with map lists', async () => {
        // We really don't have to test much here, since these values are just
        // stored in memory. Tests doing map submission and approval test this
        // system more thoroughly.
        const res = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          validate: MapListVersionDto,
          token
        });

        assert.ok(
          matchesPartial(res.body, {
            approved: any(Number),
            submissions: any(Number)
          })
        );
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/maplistversion', 'get');
      });
    });
  });

  describe('maps/{mapID}/info', () => {
    describe('GET', () => {
      let token, map;

      before(async () => {
        await ([token, map] = await Promise.all([
          db.loginNewUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with map info', async () => {
        await req.get({
          url: `maps/${map.id}/info`,
          status: 200,
          validate: MapInfoDto,
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
          url: `maps/${map.id}/info`,
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return 404 if the map is not found', async () => {
        await req.get({ url: `maps/${NULL_ID}/info`, status: 404, token });
      });
    });
  });

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

        await resetKillswitches(req, adminToken);
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

  describe('maps/{mapID}/credits/{userID}', () => {
    describe('GET', () => {
      let user, token, map, u2Token;
      const creditType = MapCreditType.AUTHOR;

      before(async () => {
        [[user, token], map, u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap(),
          db.loginNewUser()
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      beforeEach(async () => {
        await prisma.mapCredit.create({
          data: { mapID: map.id, userID: user.id, type: creditType }
        });
      });

      afterEach(async () => {
        await prisma.mapCredit.deleteMany();
      });

      it('should return the specified map credit', async () => {
        const res = await req.get({
          url: `maps/${map.id}/credits/${user.id}`,
          status: 200,
          validate: MapCreditDto,
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          type: creditType,
          userID: user.id,
          mapID: map.id
        });
      });

      it('should return the specified map credit with the user expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}/credits/${user.id}`,
          expand: 'user',
          validate: MapCreditDto,
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
          url: `maps/${map.id}/credits/${user.id}`,
          status: 403,
          token: u2Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return a 404 if the map is not found', async () => {
        await req.get({
          url: `maps/${NULL_ID}/credits/${user.id}`,
          status: 404,
          token
        });
      });

      it('should return a 404 if the user is not found', async () => {
        await req.get({
          url: `maps/${map.id}/credits/${NULL_ID}`,
          status: 404,
          token
        });
      });
    });
  });

  describe('maps/{mapID}/zones', () => {
    describe('GET', () => {
      const zones = ZonesStub;

      let token, map;
      before(async () => {
        await ([token, map] = await Promise.all([
          db.loginNewUser(),
          db.createMap({
            versions: {
              create: {
                zones: ZonesStubString,
                versionNum: 1,
                submitter: db.getNewUserCreateData()
              }
            }
          })
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with the map zones', async () => {
        const res = await req.get({
          url: `maps/${map.id}/zones`,
          status: 200,
          token
        });

        const parsed = JSON.parse(res.body);
        assert.partialDeepStrictEqual(parsed, zones);
        assert.doesNotThrow(() => validateZoneFile(parsed));
      });

      it('should 404 if the map does not exist', async () => {
        await req.get({ url: `maps/${NULL_ID}/zones`, status: 404, token });
      });
    });
  });

  describe('maps/{mapID}/images', () => {
    describe('GET', () => {
      let token, map, id1, id2;
      before(async () => {
        [id1, id2] = [db.uuid(), db.uuid()];
        [token, map] = await Promise.all([
          db.loginNewUser(),
          db.createMap({ images: [id2, id1] })
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with a list of images', async () => {
        const res = await req.get({
          url: `maps/${map.id}/images`,
          status: 200,
          validateArray: { type: MapImageDto, length: 2 },
          token
        });

        assert.ok(
          matchesPartial(res.body, [
            {
              small: stringContaining(`${id2}-small.jpg`),
              medium: stringContaining(`${id2}-medium.jpg`),
              large: stringContaining(`${id2}-large.jpg`),
              xl: stringContaining(`${id2}-xl.jpg`)
            },
            {
              small: stringContaining(`${id1}-small.jpg`),
              medium: stringContaining(`${id1}-medium.jpg`),
              large: stringContaining(`${id1}-large.jpg`),
              xl: stringContaining(`${id1}-xl.jpg`)
            }
          ])
        );
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/images`,
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should 404 if map does not exist', async () => {
        await req.get({ url: `maps/${NULL_ID}/images`, status: 404, token });
      });
    });

    describe('PUT', () => {
      let user, token, map;

      const imageBuffer = readFileSync(path.join(FILES_PATH, '2560_1440.png'));

      before(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
      });

      beforeEach(async () => {
        map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          submitter: { connect: { id: user.id } }
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('mMap', 'adminActivity'),
          fileStore.deleteDirectory('img')
        ]);
      });

      it('should create a map image for the specified map', async () => {
        const res = await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          data: { imageIDs: ['0'] },
          validateArray: { type: MapImageDto, length: 1 },
          token
        });

        const updatedMap = await prisma.mMap.findFirst();
        for (const size of ['small', 'medium', 'large', 'xl']) {
          assert.notEqual(res.body[0][size], undefined);
          assert.equal(
            await fileStore.exists(`img/${updatedMap.images[0]}-${size}.jpg`),
            true
          );
        }
      });

      it('should 503 if killswitch guard is active for maps/{mapID}/images PUT', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_SUBMISSION: true
          },
          token: adminToken
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 503,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          data: { imageIDs: ['0'] },
          token
        });

        await resetKillswitches(req, adminToken);
      });

      it('should reorder images correctly, and delete any unused ones', async () => {
        const [id1, id2] = [db.uuid(), db.uuid()];

        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [id1, id2] }
        });

        const buf = Buffer.alloc(1);
        for (const id of [id1, id2])
          for (const size of ['small', 'medium', 'large', 'xl'])
            await fileStore.add(`img/${id}-${size}.jpg`, buf);

        for (const id of [id1, id2])
          for (const size of ['small', 'medium', 'large', 'xl'])
            assert.equal(await fileStore.exists(`img/${id}-${size}.jpg`), true);

        const res = await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' },
            { file: imageBuffer, field: 'images', fileName: 'hello2.png' }
          ],
          data: { imageIDs: ['0', id1, '1'] },
          validateArray: { type: MapImageDto, length: 3 },
          token
        });

        const { images } = await prisma.mMap.findFirst();
        assert.ok(
          matchesPartial(
            res.body,
            images.map((id) => ({
              id,
              small: stringContaining(`${id}-small.jpg`),
              medium: stringContaining(`${id}-medium.jpg`),
              large: stringContaining(`${id}-large.jpg`),
              xl: stringContaining(`${id}-xl.jpg`)
            }))
          )
        );
        assert.equal(images.length, 3);
        assert.equal(images[0][8], '-'); // World's laziest uuid validation, whatever
        assert.equal(images[1], id1);
        assert.equal(images[2][8], '-');

        for (const id of images)
          for (const size of ['small', 'medium', 'large', 'xl'])
            assert.equal(await fileStore.exists(`img/${id}-${size}.jpg`), true);

        for (const size of ['small', 'medium', 'large', 'xl'])
          assert.equal(await fileStore.exists(`img/${id2}-${size}.jpg`), false);
      });

      it('should reorder with no files provided', async () => {
        const [id1, id2] = [db.uuid(), db.uuid()];

        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [id1, id2] }
        });

        const res = await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          data: { imageIDs: [id2, id1] },
          validateArray: { type: MapImageDto, length: 3 },
          token
        });

        assert.equal(res.body[0].id, id2);
        assert.equal(res.body[1].id, id1);

        const { images } = await prisma.mMap.findUnique({
          where: { id: map.id }
        });
        assert.deepEqual(images, [id2, id1]);
      });

      it('should 400 when the map image limit has been reached', async () => {
        map = await prisma.mMap.update({
          where: { id: map.id },
          data: { images: arrayFrom(5, () => db.uuid()) }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          data: { imageIDs: [...map.images, '0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token
        });
      });

      it('should 400 if the map image has bad extension', async () => {
        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          files: [{ file: 'map.zon', field: 'images' }],
          data: { imageIDs: ['0'] },
          token
        });
      });

      it('should 400 for PNG with wrong dimensions', async () => {
        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          files: [{ file: '1920_1080.png', field: 'images' }],
          data: { imageIDs: ['0'] },
          token
        });
      });

      it('should 400 for JPG with correct dimensions', async () => {
        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          files: [{ file: '2560_1440.jpg', field: 'images' }],
          data: { imageIDs: ['0'] },
          token
        });
      });

      it("should 400 when the image file is greater than the config's max image file size", async () => {
        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          data: { imageIDs: ['0'] },
          files: [
            { file: Buffer.alloc(Config.limits.imageSize + 1), field: 'images' }
          ],
          token
        });
      });

      it('should 403 if the user is not the submitter of the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'George Weasley' } } }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 403,
          data: { imageIDs: ['0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { connect: { id: user.id } } }
        });
      });

      it('should allow a mod user', async () => {
        const modToken = await db.loginNewUser({
          data: { roles: Role.MODERATOR }
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          data: { imageIDs: ['0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token: modToken
        });
      });

      it('should generate an admin activity for a mod user', async () => {
        const [mod, modToken] = await db.createAndLoginUser({
          data: { roles: Role.MODERATOR }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          data: { imageIDs: ['0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token: modToken
        });

        const activity = await prisma.adminActivity.findFirst();
        assert.partialDeepStrictEqual(activity, {
          userID: mod.id,
          type: AdminActivityType.MAP_UPDATE
        });
      });

      it('should allow an admin user', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          data: { imageIDs: ['0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token: adminToken
        });
      });

      for (const status of Enum.values(MapStatus)) {
        const shouldPass = MapStatuses.IN_SUBMISSION.includes(status);
        const expectedStatus = shouldPass ? 200 : 403;

        it(`should ${expectedStatus} if the map is not in the ${MapStatus[status]} state`, async () => {
          await prisma.mMap.update({
            where: { id: map.id },
            data: { status }
          });

          await req.putAttach({
            url: `maps/${map.id}/images`,
            status: expectedStatus,
            data: { imageIDs: ['0'] },
            files: [
              { file: imageBuffer, field: 'images', fileName: 'hello.png' }
            ],
            token
          });

          await prisma.mMap.update({
            where: { id: map.id },
            data: { status: MapStatus.PRIVATE_TESTING }
          });
        });
      }

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/1/images', 'put');
      });
    });
  });

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

  describe('maps/{mapID}/reviews', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u2Token, map, reviewOfficial, reviewUnofficial;
      before(async () => {
        [[u1, u1Token], [u2, u2Token]] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
          db.createAndLoginUser({ data: { roles: Role.REVIEWER } })
        ]);

        map = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          submitter: { connect: { id: u1.id } }
        });

        // Official review
        reviewOfficial = await prisma.mapReview.create({
          data: {
            mainText: 'Great map!',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.SURF,
                tier: 2,
                comment: 'What',
                gameplayRating: 5
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u2.id } },
            resolver: { connect: { id: u1.id } },
            resolved: true
          }
        });

        // Unofficial review
        reviewUnofficial = await prisma.mapReview.create({
          data: {
            mainText: 'Wow, what a shit map.',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.SURF,
                tier: 9,
                comment: 'The second ramp gave me cholera',
                gameplayRating: 1
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u1.id } },
            resolved: true,
            createdAt: futureDateOffset(1000),
            comments: {
              createMany: {
                data: [
                  { text: 'idiot', userID: u2.id },
                  { text: 'why would you write this', userID: u2.id },
                  { text: 'get off your computer', userID: u2.id },
                  { text: 'people like you make me sick', userID: u2.id },
                  { text: 'sorry just kidding', userID: u2.id }
                ]
              }
            }
          }
        });
      });

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

      it('should return all reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 2 },
          token: u1Token
        });
        assert.partialDeepStrictEqual(response.body.data[0], {
          mainText: 'Wow, what a shit map.',
          mapID: map.id
        });
      });

      it('should include a given number of comments', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          query: { comments: 5 },
          status: 200,
          validatePaged: { type: MapReviewDto, count: 2 },
          token: u1Token
        });

        assert.partialDeepStrictEqual(response.body.data, [
          {
            mainText: 'Wow, what a shit map.',
            numComments: 5,
            comments: [
              { userID: u2.id },
              { userID: u2.id },
              { userID: u2.id },
              { userID: u2.id },
              { userID: u2.id }
            ]
          },
          {
            mainText: 'Great map!',
            mapID: map.id,
            numComments: 0
          }
        ]);
      });

      it('should return the reviews associated to the given map expanding the map information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews`,
          token: u1Token,
          expand: 'map',
          validate: MapReviewDto,
          paged: true,
          expectedPropertyName: 'map'
        });
      });

      it('should return the reviews associated to the given map expanding the author information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews`,
          token: u1Token,
          expand: 'reviewer',
          validate: MapReviewDto,
          paged: true,
          expectedPropertyName: 'reviewer'
        });
      });

      it('should return the reviews associated to the given map expanding the resolver information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews`,
          token: u1Token,
          expand: 'resolver',
          validate: MapReviewDto,
          paged: true,
          some: true,
          expectedPropertyName: 'resolver'
        });
      });

      it('should return the official reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: true },
          token: u1Token
        });
        assert.partialDeepStrictEqual(response.body.data[0], {
          mainText: reviewOfficial.mainText,
          mapID: reviewOfficial.mapID
        });
      });

      it('should return the unofficial reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: false },
          token: u2Token
        });
        assert.partialDeepStrictEqual(response.body.data[0], {
          mainText: reviewUnofficial.mainText,
          mapID: reviewUnofficial.mapID
        });
      });

      it('should return the official reviews including reviewers', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: true, expand: 'reviewer' },
          token: u1Token
        });
        assert.ok(Object.hasOwn(response.body.data[0], 'reviewer'));
        assert.partialDeepStrictEqual(response.body.data[0], {
          mainText: reviewOfficial.mainText,
          mapID: reviewOfficial.mapID
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/reviews`,
          status: 403,
          token: u2Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return 404 for a nonexistent map', async () => {
        await req.get({
          url: `maps/${NULL_ID}/reviews`,
          status: 404,
          token: u1Token
        });
      });
    });

    describe('POST', () => {
      let normalUser: User,
        normalToken: string,
        reviewerToken: string,
        miscUser: User,
        pubTestMap: MMap,
        privTestMap: MMap;

      before(async () => {
        [[normalUser, normalToken], reviewerToken, miscUser] =
          await Promise.all([
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.REVIEWER } }),
            db.createUser()
          ]);
      });

      beforeEach(async () => {
        pubTestMap = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          submission: { create: { type: MapSubmissionType.ORIGINAL } },
          submitter: { connect: { id: miscUser.id } },
          reviewStats: { create: {} }
        });

        privTestMap = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          submitter: { connect: { id: miscUser.id } },
          reviewStats: { create: {} }
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      afterEach(async () => {
        await db.cleanup('mMap', 'notification');
      });

      it('should successfully create a review', async () => {
        const imageBuffer = readFileSync(
          path.join(FILES_PATH, 'image_jpg.jpg')
        );
        const imageHash = createSha1Hash(imageBuffer);

        const res = await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.jpg' }
          ],
          data: {
            mainText: 'Please add conc',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 1,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          validate: MapReviewDto,
          token: normalToken
        });

        const imageUrl = res.body.images[0];
        const image = await fileStore.downloadHttp(imageUrl);
        assert.equal(createSha1Hash(image), imageHash);
      });

      it('should create a MAP_REVIEW_POSTED notification for the submitter', async () => {
        const res = await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: {
            mainText:
              'course 1 gave me an anuyresm anurism thing when ur braign pops',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 1,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          validate: MapReviewDto,
          token: normalToken
        });
        const notifs = await prisma.notification.findMany({
          where: {
            notifiedUserID: miscUser.id,
            type: NotificationType.MAP_REVIEW_POSTED,
            userID: normalUser.id,
            mapID: pubTestMap.id,
            reviewID: res.body.id
          }
        });
        assert.partialDeepStrictEqual(notifs, [
          {
            notifiedUserID: miscUser.id,
            type: NotificationType.MAP_REVIEW_POSTED,
            userID: normalUser.id,
            mapID: pubTestMap.id,
            reviewID: res.body.id
          }
        ]);
      });

      it('should 503 if killswitch guard is active for maps', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_REVIEWS: true
          },
          token: adminToken
        });

        const imageBuffer = readFileSync(
          path.join(FILES_PATH, 'image_jpg.jpg')
        );

        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 503,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.jpg' }
          ],
          data: {
            mainText: 'Please add conc',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 1,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          token: normalToken
        });

        await resetKillswitches(req, adminToken);
      });

      it('should succeed with no images', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: {
            mainText: 'Please add conc',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 1,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          validate: MapReviewDto,
          token: normalToken
        });
      });

      it('should 400 for bad suggestions', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 400,
          data: {
            mainText: 'Please add conc',
            suggestions: [
              {
                gamemode: Gamemode.AHOP,
                trackType: 0,
                trackNum: 10000,
                tier: 1,
                gameplayRating: 1
              }
            ]
          },
          token: normalToken
        });
      });

      it('should not allow a regular user to set needsResolving', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 403,
          data: { mainText: 'Please add conc', needsResolving: true },
          token: normalToken
        });
      });

      it('should allow a reviewer user to set needsResolving', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: { mainText: 'Please add conc', needsResolving: true },
          validate: MapReviewDto,
          token: reviewerToken
        });
      });

      it('should not allow a regular user to set approves', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 403,
          data: { mainText: 'Please add gronc', approves: true },
          token: normalToken
        });
      });

      it('should allow a reviewer user to set approves', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: { mainText: 'Please add gronc', approves: true },
          validate: MapReviewDto,
          token: reviewerToken
        });
      });

      it('should update stats', async () => {
        const before = await prisma.mapReviewStats.findUnique({
          where: { mapID: pubTestMap.id }
        });
        assert.partialDeepStrictEqual(before, {
          total: 0,
          approvals: 0,
          resolved: 0,
          unresolved: 0
        });

        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: { mainText: 'Please add dogs', approves: true },
          validate: MapReviewDto,
          token: reviewerToken
        });

        const after1 = await prisma.mapReviewStats.findUnique({
          where: { mapID: pubTestMap.id }
        });
        assert.partialDeepStrictEqual(after1, {
          total: 1,
          approvals: 1,
          resolved: 0,
          unresolved: 0
        });

        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 201,
          data: { mainText: 'remove the dogs idiot', needsResolving: true },
          validate: MapReviewDto,
          token: reviewerToken
        });

        const after2 = await prisma.mapReviewStats.findUnique({
          where: { mapID: pubTestMap.id }
        });
        assert.partialDeepStrictEqual(after2, {
          total: 2,
          approvals: 1,
          resolved: 0,
          unresolved: 1
        });
      });

      it('should 400 if image is too large', async () => {
        await req.postAttach({
          url: `maps/${pubTestMap.id}/reviews`,
          status: 400,
          files: [
            {
              file: readFileSync(path.join(FILES_PATH, 'very_large_image.jpg')),
              field: 'images',
              fileName: 'hello.jpg'
            }
          ],
          data: { mainText: 'Please add conc' },
          token: normalToken
        });
      });

      it('should return 404 for trying to post a review for a nonexistent map', async () => {
        await req.postAttach({
          url: `maps/${NULL_ID}/reviews`,
          status: 404,
          data: { mainText: 'let me iiiiiin' },
          token: normalToken
        });
      });

      // Sufficient to test getMapAndCheckReadAccess is being called
      it('should return 403 for a review on a map in private testing without an invite', async () => {
        await req.postAttach({
          url: `maps/${privTestMap.id}/reviews`,
          status: 403,
          data: { mainText: 'PLEAAAASE LET ME INNN' },
          token: normalToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/1/reviews', 'post');
      });

      describe('Discord notifications', () => {
        let restPostMock: ReturnType<typeof mock.method>,
          restPostObservable: rxjs.Subject<void>;

        before(async () => {
          const discordMock = await mockDiscordService(app);
          restPostMock = discordMock.restPostMock;
          restPostObservable = discordMock.restPostObservable;
        });

        after(async () => {
          await mock.restoreAll();
        });
        afterEach(async () => {
          await restPostMock.mock.resetCalls();
        });

        it('should send a review to discord thread', async () => {
          await prisma.mapSubmission.update({
            where: { mapID: pubTestMap.id },
            data: {
              discordReviewThread: '5242003' // Ends with 003 - public thread. See discord.util.ts
            }
          });

          const reviewDesctiption = 'Please add conc';
          void req.postAttach({
            url: `maps/${pubTestMap.id}/reviews`,
            status: 201,
            data: {
              mainText: reviewDesctiption,
              suggestions: [
                {
                  gamemode: Gamemode.AHOP,
                  trackType: 0,
                  trackNum: 1,
                  tier: 1,
                  gameplayRating: 1
                }
              ]
            },
            validate: MapReviewDto,
            token: normalToken
          });

          await rxjs.firstValueFrom(restPostObservable);
          assert.equal(restPostMock.mock.callCount(), 1);

          const requestBody = restPostMock.mock.calls.at(-1)!.arguments[1];
          const embed = requestBody.body.embeds[0];
          assert.equal(embed.description, reviewDesctiption);
        });
      });
    });
  });

  describe('maps/{mapID}/testInvite', () => {
    describe('PUT', () => {
      let u1: User,
        u1Token: string,
        u2: User,
        u2Token: string,
        u3: User,
        u4: User,
        map: MMap;
      beforeEach(async () => {
        [[u1, u1Token], [u2, u2Token], u3, u4] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]);

        map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          submitter: { connect: { id: u1.id } }
        });
      });

      afterEach(async () => {
        await db.cleanup('mMap', 'user', 'notification');
      });

      it('should create MapTestInvites', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u2.id, u3.id, u4.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.partialDeepStrictEqual(createdRequests, [
          { userID: u2.id, state: MapTestInviteState.UNREAD },
          { userID: u3.id, state: MapTestInviteState.UNREAD },
          { userID: u4.id, state: MapTestInviteState.UNREAD }
        ]);
      });

      it('should remove any MapTestInvites not on the userID', async () => {
        await prisma.mapTestInvite.create({
          data: {
            mapID: map.id,
            userID: u2.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u3.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.partialDeepStrictEqual(createdRequests, [
          { userID: u3.id, state: MapTestInviteState.UNREAD }
        ]);
      });

      it('should remove all MapTestInvites for an empty array', async () => {
        await prisma.mapTestInvite.create({
          data: {
            mapID: map.id,
            userID: u2.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.equal(createdRequests.length, 0);
      });

      it('should leave any existing MapTestInvites contained in the userIDs unaffected', async () => {
        await prisma.mapTestInvite.createMany({
          data: [
            {
              mapID: map.id,
              userID: u2.id,
              state: MapTestInviteState.DECLINED
            },
            {
              mapID: map.id,
              userID: u3.id,
              state: MapTestInviteState.ACCEPTED
            }
          ]
        });

        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u3.id, u4.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.partialDeepStrictEqual(createdRequests, [
          { userID: u3.id, state: MapTestInviteState.ACCEPTED },
          { userID: u4.id, state: MapTestInviteState.UNREAD }
        ]);
      });

      it('should create map testing request notifications for users', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u3.id, u4.id] },
          token: u1Token
        });

        const notifs = await prisma.notification.findMany({
          where: { type: NotificationType.MAP_TESTING_INVITE }
        });
        assert.partialDeepStrictEqual(notifs, [
          {
            notifiedUserID: u3.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          },
          {
            notifiedUserID: u4.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        ]);
      });

      it('should delete map testing request notifications if users are uninvited', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u3.id, u4.id] },
          token: u1Token
        });
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u4.id] },
          token: u1Token
        });
        const notifs = await prisma.notification.findMany({
          where: { type: NotificationType.MAP_TESTING_INVITE }
        });
        assert.partialDeepStrictEqual(notifs, [
          {
            notifiedUserID: u4.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        ]);
      });

      it('should 404 in the map does not exist', async () => {
        await req.put({
          url: `maps/${NULL_ID}/testInvite`,
          status: 404,
          body: { userIDs: [] },
          token: u1Token
        });
      });

      it('should 400 if userIDs array is missing', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 400,
          body: {},
          token: u1Token
        });
      });

      it('should 403 if the user is not the submitter of the map', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 403,
          body: { userIDs: [u3.id] },
          token: u2Token
        });
      });

      it('should 400 if the userIDs contains an ID that does not exist', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 400,
          body: { userIDs: [NULL_ID] },
          token: u1Token
        });
      });

      for (const status of difference(Enum.values(MapStatus), [
        MapStatus.PRIVATE_TESTING
      ]))
        it(`should 403 if the map is in ${MapStatus[status]}`, async () => {
          await prisma.mMap.update({
            where: { id: map.id },
            data: { status }
          });

          await req.put({
            url: `maps/${map.id}/testInvite`,
            status: 403,
            body: { userIDs: [u3.id] },
            token: u1Token
          });
        });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest(`maps/${map.id}/testInvite`, 'put');
      });
    });
  });

  describe('maps/{mapID}/testInviteResponse', () => {
    describe('PATCH', () => {
      let user: User, token: string, user2: User, map: MMap;
      beforeEach(async () => {
        [[user, token], [user2]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser()
        ]);

        map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          submitter: { connect: { id: user2.id } },
          testInvites: {
            create: { userID: user.id, state: MapTestInviteState.UNREAD }
          }
        });
        await prisma.notification.create({
          data: {
            notifiedUserID: user.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        });
      });

      afterEach(async () => {
        await db.cleanup('mMap', 'user', 'notification');
      });

      it('should successfully accept a test invite', async () => {
        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 204,
          body: { accept: true },
          token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.partialDeepStrictEqual(createdRequests, [
          { userID: user.id, state: MapTestInviteState.ACCEPTED }
        ]);
      });

      it('should successfully decline a test invite', async () => {
        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 204,
          body: { accept: false },
          token
        });
      });

      it('should delete the notification corresponding to the testing request', async () => {
        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 204,
          body: { accept: true },
          token
        });
        const notifs = await prisma.notification.findMany();
        assert.equal(notifs.length, 0);
      });

      it('should 404 if the user does not have a test invite', async () => {
        await prisma.mapTestInvite.deleteMany();

        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 404,
          body: { accept: false },
          token
        });
      });

      it("should 400 if body does not contain an 'accept' value", async () => {
        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 400,
          body: {},
          token
        });
      });

      it('should 404 in the map does not exist', async () => {
        await req.patch({
          url: `maps/${NULL_ID}/testInviteResponse`,
          status: 404,
          body: { accept: true },
          token
        });
      });

      for (const status of difference(Enum.values(MapStatus), [
        MapStatus.PRIVATE_TESTING
      ]))
        it(`should 403 if the map is in ${MapStatus[status]}`, async () => {
          await prisma.mMap.update({
            where: { id: map.id },
            data: { status }
          });

          await req.patch({
            url: `maps/${map.id}/testInviteResponse`,
            status: 403,
            body: { accept: true },
            token
          });
        });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest(
          `maps/${map.id}/testInviteResponse`,
          'patch'
        );
      });
    });
  });
});
