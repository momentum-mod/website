// noinspection DuplicatedCode

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  AuthUtil,
  DbUtil,
  FileStoreUtil,
  NULL_ID,
  RequestUtil
} from '@momentum/backend/test-utils';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import {
  MapDto,
  ReportDto,
  UserDto,
  XpSystemsDto
} from '@momentum/backend/dto';
import {
  ActivityType,
  Ban,
  MapCreditType,
  MapStatus,
  ReportCategory,
  ReportType,
  Role
} from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';

describe('Admin', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fs: FileStoreUtil,
    auth: AuthUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    auth = env.auth;
    fs = env.fs;
  });

  afterAll(() => teardownE2ETestEnvironment(app));

  describe('admin/users', () => {
    describe('POST', () => {
      let modToken, adminToken, nonAdminToken;

      beforeAll(async () => {
        [modToken, adminToken, nonAdminToken] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser()
        ]);
      });

      afterAll(() => db.cleanup('user'));

      it('should successfully create a placeholder user', async () => {
        const res = await req.post({
          url: 'admin/users',
          status: 201,
          body: { alias: 'Burger' },
          token: adminToken,
          validate: UserDto
        });

        expect(res.body.alias).toBe('Burger');
      });

      it('should 403 when the user requesting only is a moderator', () =>
        req.post({
          url: 'admin/users',
          status: 403,
          body: { alias: 'Barry 2' },
          token: modToken
        }));

      it('should 403 when the user requesting is not an admin', () =>
        req.post({
          url: 'admin/users',
          status: 403,
          body: { alias: 'Barry 2' },
          token: nonAdminToken
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/users', 'post'));
    });
  });

  describe('admin/users/merge', () => {
    describe('POST', () => {
      let u1, u1Token, u2, mu1, mu2, adminToken, modToken;

      beforeEach(async () => {
        [[u1, u1Token], u2, mu1, mu2, adminToken, modToken] = await Promise.all(
          [
            db.createAndLoginUser(),
            db.createUser(),
            db.createUser({
              data: { roles: Role.PLACEHOLDER }
            }),
            db.createUser(),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({
              data: { roles: Role.MODERATOR }
            })
          ]
        );

        await prisma.follow.createMany({
          data: [
            { followeeID: u1.id, followedID: mu1.id },
            {
              followeeID: u2.id,
              followedID: mu1.id,
              notifyOn: ActivityType.MAP_APPROVED,
              createdAt: new Date('12/24/2021')
            },
            {
              followeeID: u2.id,
              followedID: mu2.id,
              notifyOn: ActivityType.MAP_UPLOADED,
              createdAt: new Date('12/25/2021')
            },
            { followeeID: mu2.id, followedID: mu1.id }
          ]
        });

        await prisma.activity.create({
          data: { type: ActivityType.REPORT_FILED, userID: mu1.id, data: 1n }
        });
      });

      afterAll(() => db.cleanup('user'));

      it('should merge two accounts together', async () => {
        const res = await req.post({
          url: 'admin/users/merge',
          status: 201,
          body: { placeholderID: mu1.id, userID: mu2.id },
          token: adminToken,
          validate: UserDto
        });

        expect(res.body.id).toBe(mu2.id);
        expect(res.body.alias).toBe(mu2.alias);

        // U1 was following MU1, that should be transferred to MU2.
        const u1Follow = await prisma.follow.findFirst({
          where: { followeeID: u1.id, followedID: mu2.id }
        });
        expect(u1Follow.followeeID).toBeTruthy();

        // U2 was following MU1 and MU2, the creation data should be earliest
        // of the two and the notifyOn flags combined.
        const u2Follow = await prisma.follow.findFirst({
          where: { followeeID: u2.id, followedID: mu2.id }
        });
        expect(new Date(u2Follow.createdAt)).toEqual(new Date('12/24/2021'));
        expect(u2Follow.notifyOn).toBe(
          ActivityType.MAP_APPROVED | ActivityType.MAP_UPLOADED
        );

        // MU2 was following MU1, that should be deleted
        const mu2Follows = await prisma.follow.findFirst({
          where: { followeeID: mu2.id, followedID: mu1.id }
        });
        expect(mu2Follows).toBeNull();

        // MU1's activities should have been transferred to MU2

        const mu2Activities = await prisma.activity.findFirst({
          where: { userID: mu2.id }
        });
        expect(mu2Activities.type).toBe(ActivityType.REPORT_FILED);

        // Placeholder should have been deleted
        const mu1DB = await prisma.user.findFirst({ where: { id: mu1.id } });
        expect(mu1DB).toBeNull();
      });

      it('should 400 if the user to merge from is not a placeholder', () =>
        req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: u1.id, userID: mu2.id },
          token: adminToken
        }));

      it('should 400 if the user to merge from does not exist', () =>
        req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: NULL_ID, userID: mu2.id },
          token: adminToken
        }));

      it('should 400 if the user to merge to does not exist', () =>
        req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: mu1.id, userID: NULL_ID },
          token: adminToken
        }));

      it('should 400 if the user to merge are the same user', () =>
        req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: mu1.id, userID: mu1.id },
          token: adminToken
        }));

      it('should 403 when the user requesting is only a moderator', () =>
        req.post({
          url: 'admin/users/merge',
          status: 403,
          body: { placeholderID: mu1.id, userID: mu2.id },
          token: modToken
        }));

      it('should 403 when the user requesting is not an admin', () =>
        req.post({
          url: 'admin/users/merge',
          status: 403,
          body: { placeholderID: mu1.id, userID: mu2.id },
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/users/merge', 'post'));
    });
  });

  describe('admin/users/{userID}', () => {
    describe('PATCH', () => {
      let admin,
        adminToken,
        adminGameToken,
        admin2,
        u1,
        u1Token,
        u2,
        u3,
        mod,
        modToken,
        mod2;

      beforeEach(async () => {
        [
          [admin, adminToken],
          admin2,
          [u1, u1Token],
          u2,
          u3,
          [mod, modToken],
          mod2
        ] = await Promise.all([
          db.createAndLoginUser({
            data: { roles: Role.ADMIN }
          }),
          db.createUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser(),
          db.createUser({ data: { roles: Role.VERIFIED } }),
          db.createUser({ data: { roles: Role.VERIFIED } }),
          db.createAndLoginUser({ data: { roles: Role.MODERATOR } }),
          db.createUser({ data: { roles: Role.MODERATOR } })
        ]);
        adminGameToken = auth.gameLogin(admin);
      });

      afterAll(() => db.cleanup('user'));

      it("should successfully update a specific user's alias", async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { alias: 'Barry 2' },
          token: adminToken
        });

        const res = await req.get({
          url: `users/${u1.id}`,
          status: 200,
          token: adminToken
        });

        expect(res.body.alias).toBe('Barry 2');
      });

      it("should 409 when an admin tries to set a verified user's alias to something used by another verified user", () =>
        req.patch({
          url: `admin/users/${u2.id}`,
          status: 409,
          body: { alias: u3.alias },
          token: adminToken
        }));

      it("should allow an admin to set a verified user's alias to something used by another unverified user", () =>
        req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { alias: mod.alias },
          token: adminToken
        }));

      it("should allow an admin to set a unverified user's alias to something used by another verified user", () =>
        req.patch({
          url: `admin/users/${mod.id}`,
          status: 204,
          body: { alias: u2.alias },
          token: adminToken
        }));

      it("should successfully update a specific user's bio", async () => {
        const bio = "I'm hungry";
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { bio: bio },
          token: adminToken
        });

        const res = await req.get({
          url: `users/${u1.id}/profile`,
          status: 200,
          token: adminToken
        });

        expect(res.body.bio).toBe(bio);
      });

      it("should successfully update a specific user's bans", async () => {
        const bans = Bitflags.join(Ban.AVATAR, Ban.LEADERBOARDS);

        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { bans: bans },
          token: adminToken
        });

        const userDB = await prisma.user.findFirst({ where: { id: u1.id } });

        expect(userDB.bans).toBe(bans);
      });

      it("should successfully update a specific user's roles", async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { roles: Role.MAPPER },
          token: adminToken
        });

        const userDB = await prisma.user.findFirst({ where: { id: u1.id } });

        expect(Bitflags.has(userDB.roles, Role.MAPPER)).toBe(true);
      });

      it('should allow an admin to make a regular user a moderator', () =>
        req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { roles: Role.MODERATOR },
          token: adminToken
        }));

      it("should allow an admin to update a moderator's roles", () =>
        req.patch({
          url: `admin/users/${mod.id}`,
          status: 204,
          body: { roles: Role.MAPPER },
          token: adminToken
        }));

      it('should allow an admin to remove a user as moderator', () =>
        req.patch({
          url: `admin/users/${mod.id}`,
          status: 204,
          body: { roles: 0 },
          token: adminToken
        }));

      it("should not allow an admin to update another admin's roles", () =>
        req.patch({
          url: `admin/users/${admin2.id}`,
          status: 403,
          body: { roles: Role.MAPPER },
          token: adminToken
        }));

      it('should allow an admin to update their own non-admin roles', () =>
        req.patch({
          url: `admin/users/${admin.id}`,
          status: 204,
          body: { roles: Role.MAPPER },
          token: adminToken
        }));

      it('should allow an admin to update their own moderator role', () =>
        req.patch({
          url: `admin/users/${admin.id}`,
          status: 204,
          body: { roles: Role.MODERATOR },
          token: adminToken
        }));

      it('should allow an admin to update their own admin role', () =>
        req.patch({
          url: `admin/users/${admin.id}`,
          status: 204,
          body: { roles: 0 },
          token: adminToken
        }));

      it("should successfully allow a moderator to update a specific user's roles", () =>
        req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { roles: Role.MAPPER },
          token: modToken
        }));

      it('should not allow a moderator to make another user a moderator', () =>
        req.patch({
          url: `admin/users/${u1.id}`,
          status: 403,
          body: { roles: Role.MODERATOR },
          token: modToken
        }));

      it("should not allow a moderator to update another moderator's roles", () =>
        req.patch({
          url: `admin/users/${mod2.id}`,
          status: 403,
          body: { roles: 0 },
          token: modToken
        }));

      it("should not allow a moderator to update an admin's roles", () =>
        req.patch({
          url: `admin/users/${admin2.id}`,
          status: 403,
          body: { roles: Role.MAPPER },
          token: modToken
        }));

      it('should allow a moderator to update their own non-mod roles', () =>
        req.patch({
          url: `admin/users/${mod.id}`,
          status: 204,
          body: { roles: Bitflags.join(Role.MAPPER, Role.MODERATOR) },
          token: modToken
        }));

      it('should not allow a moderator to update their own mod role', () =>
        req.patch({
          url: `admin/users/${mod.id}`,
          status: 403,
          body: { roles: 0 },
          token: modToken
        }));

      it('should 403 when the user requesting is not an admin', () =>
        req.patch({
          url: `admin/users/${u1.id}`,
          status: 403,
          body: { alias: 'Barry 2' },
          token: u1Token
        }));

      it('should 403 when authenticated from game', () =>
        req.patch({
          url: `admin/users/${u1.id}`,
          status: 403,
          body: { roles: Role.MAPPER },
          token: adminGameToken
        }));

      it('should 401 when no access token is provided', () =>
        req.patch({ url: `admin/users/${u1.id}`, status: 401 }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/users/1', 'patch'));
    });

    describe('DELETE', () => {
      let u1, u1Token, adminToken, modToken;

      beforeEach(async () => {
        [[u1, u1Token], adminToken, modToken] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } })
        ]);
      });

      afterEach(() => prisma.user.deleteMany());

      afterAll(() => db.cleanup('map', 'rank', 'run', 'report', 'activity'));

      it('should delete user data, leaving placeholder', async () => {
        const followeeUser = await db.createUser();
        const map = await db.createMap();
        let userToBeDeleted = await prisma.user.create({
          data: {
            roles: Role.MAPPER,
            bans: Ban.BIO,
            steamID: 12345,
            alias: 'User to be deleted',
            avatar: 'yeeeee',
            country: 'NA',
            userAuth: { create: { refreshToken: 'yeeeee' } },
            profile: {
              create: { bio: 'yeeeee', socials: { RandomSocial: 'bemyguest' } }
            },
            userStats: { create: { totalJumps: 100 } },
            submittedMaps: { connect: [{ id: map.id }] },
            mapCredits: {
              create: { type: MapCreditType.AUTHOR, mapID: map.id }
            },
            mapFavorites: { create: { map: { connect: { id: map.id } } } },
            mapLibraryEntries: { create: { map: { connect: { id: map.id } } } },
            mapReviews: {
              create: {
                map: { connect: { id: map.id } },
                text: "That's a good map"
              }
            },
            follows: {
              create: { followed: { connect: { id: followeeUser.id } } }
            },
            followers: {
              create: { followee: { connect: { id: followeeUser.id } } }
            },
            mapNotifies: {
              create: { map: { connect: { id: map.id } }, notifyOn: 8 }
            },
            runSessions: {
              create: {
                trackNum: 1,
                zoneNum: 1,
                track: { connect: { id: map.mainTrackID } }
              }
            }
          },
          include: {
            userAuth: true,
            profile: true,
            userStats: true,
            submittedMaps: true,
            mapCredits: true,
            mapFavorites: true,
            mapLibraryEntries: true,
            mapRanks: true,
            mapReviews: true,
            activities: true,
            follows: true,
            followers: true,
            mapNotifies: true,
            notifications: true,
            runSessions: true,
            runs: true,
            reportSubmitted: true,
            reportResolved: true
          }
        });
        await db.createRunAndRankForMap({ map, user: userToBeDeleted });
        await prisma.activity.create({
          data: {
            type: ActivityType.MAP_APPROVED,
            data: 123,
            notifications: {
              create: {
                read: true,
                user: { connect: { id: userToBeDeleted.id } }
              }
            },
            user: { connect: { id: userToBeDeleted.id } }
          }
        });
        await prisma.report.create({
          data: {
            data: 123,
            type: ReportType.MAP_REPORT,
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            message: 'yeeeee',
            resolved: true,
            resolutionMessage: 'yeeeeee',
            submitter: { connect: { id: userToBeDeleted.id } },
            resolver: { connect: { id: userToBeDeleted.id } }
          }
        });

        userToBeDeleted = await prisma.user.findUnique({
          where: { id: userToBeDeleted.id },
          include: {
            userAuth: true,
            profile: true,
            userStats: true,
            submittedMaps: true,
            mapCredits: true,
            mapFavorites: true,
            mapLibraryEntries: true,
            mapRanks: true,
            mapReviews: true,
            activities: true,
            follows: true,
            followers: true,
            mapNotifies: true,
            notifications: true,
            runSessions: true,
            runs: true,
            reportSubmitted: true,
            reportResolved: true
          }
        });

        await req.del({
          url: `admin/users/${userToBeDeleted.id}`,
          status: 204,
          token: adminToken
        });

        const deletedUser = await prisma.user.findUnique({
          where: { id: userToBeDeleted.id },
          include: {
            userAuth: true,
            profile: true,
            userStats: true,
            submittedMaps: true,
            mapCredits: true,
            mapFavorites: true,
            mapLibraryEntries: true,
            mapRanks: true,
            mapReviews: true,
            activities: true,
            follows: true,
            followers: true,
            mapNotifies: true,
            notifications: true,
            runSessions: true,
            runs: true,
            reportSubmitted: true,
            reportResolved: true
          }
        });

        expect(deletedUser).toMatchObject({
          roles: Role.DELETED,
          bans: userToBeDeleted.bans,
          steamID: null,
          alias: 'Deleted User',
          avatar: null,
          country: null,
          userAuth: null,
          profile: { bio: '', socials: {} },
          userStats: userToBeDeleted.userStats,
          submittedMaps: userToBeDeleted.submittedMaps,
          mapCredits: userToBeDeleted.mapCredits,
          mapFavorites: [],
          mapLibraryEntries: [],
          mapRanks: userToBeDeleted.mapRanks,
          mapReviews: userToBeDeleted.mapReviews,
          activities: [],
          follows: [],
          followers: [],
          mapNotifies: userToBeDeleted.mapNotifies,
          notifications: [],
          runSessions: [],
          runs: userToBeDeleted.runs,
          reportSubmitted: userToBeDeleted.reportSubmitted,
          reportResolved: userToBeDeleted.reportResolved
        });
      });

      it('should 403 when the user requesting only is a moderator', () =>
        req.del({ url: `admin/users/${u1.id}`, status: 403, token: modToken }));

      it('should 403 when the user requesting is not an admin', () =>
        req.del({ url: `admin/users/${u1.id}`, status: 403, token: u1Token }));

      it('should 401 when no access token is provided', () =>
        req.del({ url: `admin/users/${u1.id}`, status: 401 }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/users/1', 'del'));
    });
  });

  describe('admin/maps', () => {
    describe('GET', () => {
      let modToken, adminToken, u1, u1Token, m1, m2, m3, m4;

      beforeAll(
        async () =>
          ([modToken, adminToken, [u1, u1Token], [m1, m2, m3, m4]] =
            await Promise.all([
              db.loginNewUser({
                data: { roles: Role.MODERATOR }
              }),
              db.loginNewUser({ data: { roles: Role.ADMIN } }),
              db.createAndLoginUser(),
              db.createMaps(4)
            ]))
      );

      afterAll(() => db.cleanup('user', 'map', 'run'));

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'admin/maps',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: adminToken
        });

        for (const item of res.body.data) {
          expect(item).toHaveProperty('mainTrack');
          expect(item).toHaveProperty('info');
        }
      });

      it('should be ordered by date', () =>
        req.sortByDateTest({
          url: 'admin/maps',
          validate: MapDto,
          token: adminToken
        }));

      it('should respond with filtered map data using the take parameter', () =>
        req.takeTest({
          url: 'admin/maps',
          validate: MapDto,
          token: adminToken
        }));

      it('should respond with filtered map data using the skip parameter', () =>
        req.skipTest({
          url: 'admin/maps',
          validate: MapDto,
          token: adminToken
        }));

      it('should respond with filtered map data using the search parameter', async () => {
        m2 = await prisma.map.update({
          where: { id: m2.id },
          data: { name: 'aaaaa' }
        });

        await req.searchTest({
          url: 'admin/maps',
          token: adminToken,
          searchMethod: 'contains',
          searchString: 'aaaaa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });
      });

      it('should respond with filtered map data using the submitter id parameter', async () => {
        await prisma.map.update({
          where: { id: m2.id },
          data: { submitterID: u1.id }
        });

        const res = await req.get({
          url: 'admin/maps',
          status: 200,
          query: { submitterID: u1.id },
          validatePaged: { type: MapDto, count: 1 },
          token: adminToken
        });

        expect(res.body.data[0]).toMatchObject({
          submitterID: u1.id,
          id: m2.id
        });
      });

      it('should respond with filtered map data based on the map type', async () => {
        await prisma.map.update({
          where: { id: m2.id },
          data: { status: MapStatus.PUBLIC_TESTING }
        });

        const res = await req.get({
          url: 'admin/maps',
          status: 200,
          query: { status: MapStatus.PUBLIC_TESTING },
          validatePaged: { type: MapDto, count: 1 },
          token: adminToken
        });

        expect(res.body.data[0]).toMatchObject({
          status: MapStatus.PUBLIC_TESTING,
          id: m2.id
        });
      });

      it('should respond with expanded submitter data using the submitter expand parameter', async () => {
        await prisma.map.updateMany({ data: { submitterID: u1.id } });

        await req.expandTest({
          url: 'admin/maps',
          expand: 'submitter',
          paged: true,
          validate: MapDto,
          token: adminToken
        });
      });

      it('should respond with expanded map data using the credits expand parameter', async () => {
        await prisma.mapCredit.createMany({
          data: [
            { mapID: m1.id, userID: u1.id, type: MapCreditType.AUTHOR },
            { mapID: m2.id, userID: u1.id, type: MapCreditType.AUTHOR },
            { mapID: m3.id, userID: u1.id, type: MapCreditType.AUTHOR },
            { mapID: m4.id, userID: u1.id, type: MapCreditType.AUTHOR }
          ]
        });

        await req.expandTest({
          url: 'admin/maps',
          expand: 'credits',
          paged: true,
          validate: MapDto,
          token: adminToken
        });
      });

      it('should return 403 if a non admin access token is given', () =>
        req.get({
          url: 'admin/maps',
          status: 403,
          token: u1Token
        }));

      it('should return 403 if a mod access token is given', () =>
        req.get({
          url: 'admin/maps',
          status: 403,
          token: modToken
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/maps', 'get'));
    });
  });

  describe('admin/maps/{mapID}', () => {
    describe('PATCH', () => {
      let mod, modToken, admin, adminToken, u1, u1Token, m1, m2;

      beforeAll(
        async () =>
          ([[mod, modToken], [admin, adminToken], [u1, u1Token], [m1, m2]] =
            await Promise.all([
              db.createAndLoginUser({
                data: { roles: Role.MODERATOR }
              }),
              db.createAndLoginUser({
                data: { roles: Role.ADMIN }
              }),
              db.createAndLoginUser(),
              db.createMaps(2)
            ]))
      );

      afterAll(() => db.cleanup('user', 'map', 'run'));

      it('should successfully update a map status', async () => {
        await req.patch({
          url: `admin/maps/${m1.id}`,
          status: 204,
          body: { status: MapStatus.PUBLIC_TESTING },
          token: adminToken
        });

        const changedMap = await prisma.map.findFirst({ where: { id: m1.id } });

        expect(changedMap.status).toBe(MapStatus.PUBLIC_TESTING);
      });

      it('should create activities for map authors with map approved type after map status changed from pending to approved', async () => {
        await prisma.map.update({
          where: { id: m1.id },
          data: { status: MapStatus.PENDING }
        });

        await prisma.mapCredit.createMany({
          data: [
            { type: MapCreditType.AUTHOR, mapID: m1.id, userID: u1.id },
            { type: MapCreditType.AUTHOR, mapID: m1.id, userID: admin.id },
            { type: MapCreditType.AUTHOR, mapID: m1.id, userID: mod.id }
          ]
        });

        await req.patch({
          url: `admin/maps/${m1.id}`,
          status: 204,
          body: { status: MapStatus.APPROVED },
          token: adminToken
        });

        const mapApprovedActvities = await prisma.activity.findMany({
          where: { type: ActivityType.MAP_APPROVED, data: m1.id }
        });

        expect(mapApprovedActvities.length).toBe(3);
        expect(
          mapApprovedActvities.map((activity) => activity.userID).sort()
        ).toEqual([u1.id, admin.id, mod.id].sort());
      });

      it('should return 403 if rejected or removed map is being updated', async () => {
        await prisma.map.update({
          where: { id: m1.id },
          data: { status: MapStatus.REJECTED }
        });
        await req.patch({
          url: `admin/maps/${m1.id}`,
          status: 403,
          body: { status: MapStatus.PUBLIC_TESTING },
          token: adminToken
        });

        await prisma.map.update({
          where: { id: m2.id },
          data: { status: MapStatus.REMOVED }
        });
        await req.patch({
          url: `admin/maps/${m2.id}`,
          status: 403,
          body: { status: MapStatus.PUBLIC_TESTING },
          token: adminToken
        });
      });

      it('should return 404 if map not found', () =>
        req.patch({
          url: `admin/maps/${NULL_ID}`,
          status: 404,
          body: { status: MapStatus.PUBLIC_TESTING },
          token: adminToken
        }));

      it('should return 403 if a non admin access token is given', () =>
        req.patch({
          url: `admin/maps/${m1.id}`,
          status: 403,
          token: u1Token
        }));

      it('should return 403 if a mod access token is given', () =>
        req.patch({
          url: `admin/maps/${m1.id}`,
          status: 403,
          token: modToken
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/maps/1', 'patch'));
    });
    describe('DELETE', () => {
      let modToken, adminToken, u1, u1Token, m1;

      beforeAll(async () => {
        [modToken, adminToken, [u1, u1Token]] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser({ data: { roles: Role.MAPPER } })
        ]);
      });

      afterAll(() => db.cleanup('user', 'map', 'run'));

      beforeEach(async () => {
        m1 = await db.createMap({
          submitter: { connect: { id: u1.id } },
          images: { create: {} }
        });
        await db.createRun({ map: m1, user: u1 });
      });

      afterEach(() => db.cleanup('map'));

      it('should successfully delete the map and related stored data', async () => {
        const fileKey = 'maps/my_cool_map.bsp';
        await prisma.map.update({ where: { id: m1.id }, data: { fileKey } });

        await fs.add(fileKey, readFileSync(__dirname + '/../files/map.bsp'));

        const img = await prisma.mapImage.findFirst({
          where: { mapID: m1.id }
        });
        for (const size of ['small', 'medium', 'large']) {
          await fs.add(
            `img/${img.id}-${size}.jpg`,
            readFileSync(__dirname + '/../files/image_jpg.jpg')
          );
        }

        const run = await prisma.run.findFirst({ where: { mapID: m1.id } });
        await fs.add(`runs/${run.id}`, Buffer.alloc(123));

        await req.del({
          url: `admin/maps/${m1.id}`,
          status: 204,
          token: adminToken
        });

        expect(await prisma.map.findFirst({ where: { id: m1.id } })).toBeNull();
        expect(await fs.exists(fileKey)).toBeFalsy();

        const relatedRuns = await prisma.run.findMany({
          where: { mapID: m1.id }
        });
        expect(relatedRuns.length).toBe(0);
        expect(await fs.exists(`runs/${run.id}`)).toBeFalsy();

        const relatedImages = await prisma.mapImage.findMany({
          where: { mapID: m1.id }
        });
        expect(relatedImages.length).toBe(0);
        for (const size of ['small', 'medium', 'large']) {
          expect(await fs.exists(`img/${img.id}-${size}.jpg`)).toBeFalsy();
        }
      });

      it('should return 404 if map not found', () =>
        req.del({
          url: `admin/maps/${NULL_ID}`,
          status: 404,
          token: adminToken
        }));

      it('should return 403 if a non admin access token is given', () =>
        req.del({
          url: `admin/maps/${m1.id}`,
          status: 403,
          token: u1Token
        }));

      it('should return 403 if a mod access token is given', () =>
        req.del({
          url: `admin/maps/${m1.id}`,
          status: 403,
          token: modToken
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/maps/1', 'del'));
    });
  });

  describe('admin/reports', () => {
    describe('GET', () => {
      let adminToken, u1, u1Token, r1, _r2;

      beforeAll(async () => {
        [adminToken, [u1, u1Token]] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser()
        ]);

        r1 = await prisma.report.create({
          data: {
            data: 1,
            type: ReportType.MAP_REPORT,
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            message: 'report message',
            resolved: false,
            resolutionMessage: '',
            submitterID: u1.id
          }
        });

        _r2 = await prisma.report.create({
          data: {
            data: 2,
            type: ReportType.USER_PROFILE_REPORT,
            category: ReportCategory.PLAGIARISM,
            message: 'report2 message',
            resolved: true,
            resolutionMessage: '2',
            submitterID: u1.id
          }
        });
      });

      afterAll(() => db.cleanup('user', 'report'));

      it('should return a list of reports', async () => {
        const reports = await req.get({
          url: 'admin/reports',
          status: 200,
          token: adminToken,
          validatePaged: { type: ReportDto, count: 2 }
        });
        expect(reports.body).toHaveProperty('data');
        expect(reports.body.data[0].data).toBe(Number(r1.data));
        expect(reports.body.data[0].type).toBe(r1.type);
        expect(reports.body.data[0].category).toBe(r1.category);
        expect(reports.body.data[0].message).toBe(r1.message);
        expect(reports.body.data[0].resolved).toBe(r1.resolved);
        expect(reports.body.data[0].resolutionMessage).toBe(
          r1.resolutionMessage
        );
        expect(reports.body.data[0].submitterID).toBe(r1.submitterID);
      });

      it('should only return resolved or non resolved based on query param resolved', async () => {
        const reportsResolved = await req.get({
          url: 'admin/reports',
          status: 200,
          query: { resolved: true },
          token: adminToken,
          validatePaged: { type: ReportDto, count: 1 }
        });

        expect(reportsResolved.body.data[0].resolved).toBe(true);

        const reportsNonResolved = await req.get({
          url: 'admin/reports',
          status: 200,
          query: { resolved: false },
          token: adminToken,
          validatePaged: { type: ReportDto, count: 1 }
        });

        expect(reportsNonResolved.body.data[0].resolved).toBe(false);
      });

      it('should limit the result set when using the take query param', () =>
        req.takeTest({
          url: 'admin/reports',
          validate: ReportDto,
          token: adminToken
        }));

      it('should skip some of the result set when using the skip query param', () =>
        req.skipTest({
          url: 'admin/reports',
          validate: ReportDto,
          token: adminToken
        }));

      it('should return a list of reports with the submitter include', () =>
        req.expandTest({
          url: 'admin/reports',
          validate: ReportDto,
          expand: 'submitter',
          paged: true,
          token: adminToken
        }));

      it('should return a list of reports with the resolver include', () =>
        req.expandTest({
          url: 'admin/reports',
          validate: ReportDto,
          expand: 'submitter',
          paged: true,
          token: adminToken
        }));

      it('should return 403 if a non admin access token is given', () =>
        req.get({
          url: 'admin/reports',
          status: 403,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/reports', 'get'));
    });
  });

  describe('admin/reports/{reportID}', () => {
    describe('PATCH', () => {
      let admin, adminToken, u1, u1Token, r1, _r2;

      beforeEach(async () => {
        [[admin, adminToken], [u1, u1Token]] = await Promise.all([
          db.createAndLoginUser({
            data: { roles: Role.ADMIN }
          }),
          db.createAndLoginUser()
        ]);

        r1 = await prisma.report.create({
          data: {
            data: 1,
            type: ReportType.MAP_REPORT,
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            message: 'report message',
            resolved: false,
            resolutionMessage: '',
            submitterID: u1.id
          }
        });

        _r2 = await prisma.report.create({
          data: {
            data: 2,
            type: ReportType.USER_PROFILE_REPORT,
            category: ReportCategory.PLAGIARISM,
            message: 'report2 message',
            resolved: true,
            resolutionMessage: '2',
            submitterID: u1.id
          }
        });
      });

      afterEach(() => db.cleanup('user', 'report'));

      it('should edit a report', async () => {
        await req.patch({
          url: `admin/reports/${r1.id}`,
          status: 204,
          body: { resolved: true, resolutionMessage: 'resolved' },
          token: adminToken
        });

        const changedReport = await prisma.report.findFirst({
          where: { id: r1.id }
        });

        expect(changedReport.resolved).toBe(true);
        expect(changedReport.resolutionMessage).toBe('resolved');
        expect(changedReport.resolverID).toBe(admin.id);
      });

      it('should return 404 if targeting a nonexistent report', () =>
        req.patch({
          url: `admin/reports/${NULL_ID}`,
          status: 404,
          body: { resolved: true, resolutionMessage: 'resolved' },
          token: adminToken
        }));

      it('should return 403 if a non admin access token is given', () =>
        req.patch({
          url: `admin/reports/${r1.id}`,
          status: 403,
          token: u1Token
        }));

      it('should return 401 if no access token is given', () =>
        req.patch({ url: `admin/reports/${r1.id}`, status: 401 }));
    });
  });

  describe('admin/xpsys', () => {
    let adminToken, modToken, u1Token;

    beforeEach(async () => {
      [adminToken, modToken, u1Token] = await Promise.all([
        db.loginNewUser({ data: { roles: Role.ADMIN } }),
        db.loginNewUser({ data: { roles: Role.MODERATOR } }),
        db.loginNewUser()
      ]);

      await prisma.xpSystems.deleteMany();
      await prisma.xpSystems.create({
        data: {
          id: 1,
          rankXP: {
            top10: {
              WRPoints: 3000,
              rankPercentages: [
                1, 0.75, 0.68, 0.61, 0.57, 0.53, 0.505, 0.48, 0.455, 0.43
              ]
            },
            groups: {
              maxGroups: 4,
              groupMinSizes: [10, 45, 125, 250],
              groupExponents: [0.5, 0.56, 0.62, 0.68],
              groupPointPcts: [0.2, 0.13, 0.07, 0.03],
              groupScaleFactors: [1, 1.5, 2, 2.5]
            },
            formula: { A: 50000, B: 49 }
          },

          cosXP: {
            levels: {
              maxLevels: 500,
              startingValue: 20000,
              staticScaleStart: 101,
              linearScaleInterval: 10,
              staticScaleInterval: 25,
              linearScaleBaseIncrease: 1000,
              staticScaleBaseMultiplier: 1.5,
              linearScaleIntervalMultiplier: 1,
              staticScaleIntervalMultiplier: 0.5
            },
            completions: {
              repeat: {
                tierScale: { bonus: 40, linear: 20, staged: 40, stages: 5 }
              },
              unique: { tierScale: { linear: 2500, staged: 2500 } }
            }
          },
          createdAt: new Date('12/24/2021'),
          updatedAt: new Date('12/25/2021')
        }
      });
    });

    afterEach(() => db.cleanup('user'));
    afterAll(() => db.cleanup('xpSystems'));

    describe('GET', () => {
      it('should respond with the current XP System variables when the user is an admin', () =>
        req.get({
          url: 'admin/xpsys',
          status: 200,
          token: adminToken,
          validate: XpSystemsDto
        }));

      it('should respond with the current XP System variables when the user is a moderator', () =>
        req.get({
          url: 'admin/xpsys',
          status: 200,
          token: modToken,
          validate: XpSystemsDto
        }));

      it('should 403 when the user requesting is not an admin', () =>
        req.get({
          url: 'admin/xpsys',
          status: 403,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/xpsys', 'get'));
    });

    describe('PUT', () => {
      const body = {
        rankXP: {
          top10: {
            WRPoints: 3000,
            rankPercentages: [
              1, 0.75, 0.68, 0.61, 0.57, 0.53, 0.505, 0.48, 0.455, 0.43
            ]
          },
          groups: {
            maxGroups: 4,
            groupMinSizes: [10, 45, 125, 250],
            groupExponents: [0.5, 0.56, 0.62, 0.68],
            groupPointPcts: [0.2, 0.13, 0.07, 0.03],
            groupScaleFactors: [1, 1.5, 2, 2.5]
          },
          formula: { A: 50000, B: 49 }
        },

        cosXP: {
          levels: {
            maxLevels: 600,
            startingValue: 20000,
            staticScaleStart: 101,
            linearScaleInterval: 10,
            staticScaleInterval: 25,
            linearScaleBaseIncrease: 1000,
            staticScaleBaseMultiplier: 1.5,
            linearScaleIntervalMultiplier: 1,
            staticScaleIntervalMultiplier: 0.5
          },
          completions: {
            repeat: {
              tierScale: { bonus: 40, linear: 20, staged: 40, stages: 5 }
            },
            unique: { tierScale: { linear: 2500, staged: 2500 } }
          }
        }
      };

      it('should update the XP system variables', async () => {
        await req.put({
          url: 'admin/xpsys',
          status: 204,
          body: body,
          token: adminToken
        });

        const res = await req.get({
          url: 'admin/xpsys',
          status: 200,
          token: adminToken,
          validate: XpSystemsDto
        });

        expect(res.body.cosXP.levels.maxLevels).toBe(600);
        expect(res.body).toStrictEqual(body as XpSystemsDto);
      });

      it('should 400 when updating the XP system variables with missing values', async () => {
        const incompleteBody = body;
        delete incompleteBody.rankXP.top10.rankPercentages;

        await req.put({
          url: 'admin/xpsys',
          status: 400,
          body: incompleteBody,
          token: adminToken
        });
      });

      it('should 403 when the user requesting is a moderator', () =>
        req.put({
          url: 'admin/xpsys',
          status: 403,
          body: body,
          token: modToken
        }));

      it('should 403 when the user requesting is not an admin', () =>
        req.put({
          url: 'admin/xpsys',
          status: 403,
          body: body,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/xpsys', 'get'));
    });
  });
});
