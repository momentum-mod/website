// noinspection DuplicatedCode

import {
  AdminActivityDto,
  MapDto,
  MapReviewDto,
  ReportDto,
  UserDto
} from '../../backend/src/app/dto';
import { MAPLIST_UPDATE_JOB_NAME } from '../../backend/src/app/modules/maps/map-list.service';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ActivityType,
  AdminActivityType,
  Ban,
  FlatMapList,
  Gamemode,
  LeaderboardType,
  MapCreditType,
  mapReviewAssetPath,
  MapStatus,
  MapSubmissionType,
  MapTestInviteState,
  NotificationType,
  ReportCategory,
  ReportType,
  Role,
  runPath,
  TrackType,
  KillswitchType,
  Killswitches,
  MapTag,
  bspPath,
  imgLargePath,
  imgMediumPath,
  imgSmallPath,
  imgXlPath,
  vmfsPath
} from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import * as Enum from '@momentum/enum';
import {
  AuthUtil,
  createSha1Hash,
  DbUtil,
  E2ETestMMap,
  FILES_PATH,
  FileStoreUtil,
  NULL_ID,
  RequestUtil
} from '@momentum/test-utils';
import {
  MapReview,
  MMap,
  Prisma,
  PrismaClient,
  Report,
  User
} from '@momentum/db';
import Zip from 'adm-zip';
import {
  BabyZonesStubString,
  ZonesStubLeaderboards,
  ZonesStubString
} from '@momentum/formats/zone';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { createHash, randomUUID } from 'node:crypto';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

describe('Admin', () => {
  let app: NestFastifyApplication,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fileStore: FileStoreUtil,
    auth: AuthUtil,
    checkScheduledMapListUpdates: () => Promise<void>;

  async function expectAdminActivityWasCreated(
    userID: number,
    type: AdminActivityType
  ) {
    const activities = await prisma.adminActivity.findMany({
      where: { userID }
    });
    expect(activities.some((activity) => activity.type === type)).toBeTruthy();
  }

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    auth = env.auth;
    fileStore = env.fileStore;
    const registry = env.app.get(SchedulerRegistry);
    checkScheduledMapListUpdates = registry.getCronJob(
      MAPLIST_UPDATE_JOB_NAME
    ).fireOnTick;
  });

  afterAll(() => teardownE2ETestEnvironment(app, prisma));

  describe('admin/users', () => {
    describe('POST', () => {
      let admin: User,
        adminToken: string,
        modToken: string,
        nonAdminToken: string;

      beforeAll(async () => {
        [[admin, adminToken], modToken, nonAdminToken] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser()
        ]);
      });

      afterAll(() => db.cleanup('user', 'adminActivity'));

      it('should successfully create a placeholder user', async () => {
        const res = await req.post({
          url: 'admin/users',
          status: 201,
          body: { alias: 'Burger' },
          token: adminToken,
          validate: UserDto
        });

        expect(res.body.alias).toBe('Burger');
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_CREATE_PLACEHOLDER
        );
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
      let admin: User,
        adminToken: string,
        modToken: string,
        u1: User,
        u1Token: string,
        u2: User,
        mergePlaceholder: User,
        mergeUser: User;

      beforeEach(async () => {
        [
          [admin, adminToken],
          modToken,
          [u1, u1Token],
          u2,
          mergePlaceholder,
          mergeUser
        ] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser({ data: { roles: Role.PLACEHOLDER } }),
          db.createUser()
        ]);

        await prisma.follow.createMany({
          data: [
            { followeeID: u1.id, followedID: mergePlaceholder.id },
            {
              followeeID: u2.id,
              followedID: mergePlaceholder.id,
              notifyOn: ActivityType.MAP_APPROVED,
              createdAt: new Date('12/24/2021')
            },
            {
              followeeID: u2.id,
              followedID: mergeUser.id,
              notifyOn: ActivityType.MAP_UPLOADED,
              createdAt: new Date('12/25/2021')
            },
            { followeeID: mergeUser.id, followedID: mergePlaceholder.id }
          ]
        });

        await prisma.activity.create({
          data: {
            type: ActivityType.REPORT_FILED,
            userID: mergePlaceholder.id,
            data: 1n
          }
        });
      });

      afterAll(() => db.cleanup('user', 'adminActivity'));

      it('should merge two accounts together', async () => {
        const res = await req.post({
          url: 'admin/users/merge',
          status: 201,
          body: { placeholderID: mergePlaceholder.id, userID: mergeUser.id },
          token: adminToken,
          validate: UserDto
        });

        expect(res.body.id).toBe(mergeUser.id);
        expect(res.body.alias).toBe(mergeUser.alias);

        // u1 was following mergePlaceholder, that should be transferred to mergeUser.
        const u1Follow = await prisma.follow.findFirst({
          where: { followeeID: u1.id, followedID: mergeUser.id }
        });
        expect(u1Follow.followeeID).toBeTruthy();

        // u2 was following mergePlaceholder and mergeUser, the creation data should be earliest
        // of the two and the notifyOn flags combined.
        const u2Follow = await prisma.follow.findFirst({
          where: { followeeID: u2.id, followedID: mergeUser.id }
        });
        expect(new Date(u2Follow.createdAt)).toEqual(new Date('12/24/2021'));
        expect(u2Follow.notifyOn).toBe(
          ActivityType.MAP_APPROVED | ActivityType.MAP_UPLOADED
        );

        // mergeUser was following mergePlaceholder, that should be deleted
        const mergeUserFollows = await prisma.follow.findFirst({
          where: { followeeID: mergeUser.id, followedID: mergePlaceholder.id }
        });
        expect(mergeUserFollows).toBeNull();

        // mergePlaceholder's activities should have been transferred to mergeUser

        const mergeUserActivities = await prisma.activity.findFirst({
          where: { userID: mergeUser.id }
        });
        expect(mergeUserActivities.type).toBe(ActivityType.REPORT_FILED);

        // Placeholder should have been deleted
        const mergePlaceholderDB = await prisma.user.findFirst({
          where: { id: mergePlaceholder.id }
        });
        expect(mergePlaceholderDB).toBeNull();

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_MERGE
        );
      });

      it('should 400 if the user to merge from is not a placeholder', () =>
        req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: u1.id, userID: mergeUser.id },
          token: adminToken
        }));

      it('should 400 if the user to merge from does not exist', () =>
        req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: NULL_ID, userID: mergeUser.id },
          token: adminToken
        }));

      it('should 400 if the user to merge to does not exist', () =>
        req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: mergePlaceholder.id, userID: NULL_ID },
          token: adminToken
        }));

      it('should 400 if the user to merge are the same user', () =>
        req.post({
          url: 'admin/users/merge',
          status: 400,
          body: {
            placeholderID: mergePlaceholder.id,
            userID: mergePlaceholder.id
          },
          token: adminToken
        }));

      it('should 403 when the user requesting is only a moderator', () =>
        req.post({
          url: 'admin/users/merge',
          status: 403,
          body: { placeholderID: mergePlaceholder.id, userID: mergeUser.id },
          token: modToken
        }));

      it('should 403 when the user requesting is not an admin', () =>
        req.post({
          url: 'admin/users/merge',
          status: 403,
          body: { placeholderID: mergePlaceholder.id, userID: mergeUser.id },
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/users/merge', 'post'));
    });
  });

  describe('admin/users/{userID}', () => {
    describe('PATCH', () => {
      let admin: User,
        adminToken: string,
        adminGameToken: string,
        admin2: User,
        mod: User,
        modToken: string,
        mod2: User,
        u1: User,
        u1Token: string,
        u2: User,
        u3: User;

      beforeEach(async () => {
        [
          [admin, adminToken],
          admin2,
          [mod, modToken],
          mod2,
          [u1, u1Token],
          u2,
          u3
        ] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser({ data: { roles: Role.MODERATOR } }),
          db.createUser({ data: { roles: Role.MODERATOR } }),
          db.createAndLoginUser({ data: { alias: 'JoeFromAccounting' } }),
          db.createUser({ data: { roles: Role.VERIFIED, alias: 'DanTheMan' } }),
          db.createUser({ data: { roles: Role.VERIFIED, alias: 'jef' } })
        ]);

        adminGameToken = auth.gameLogin(admin);
      });

      afterEach(() => db.cleanup('adminActivity'));

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
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_UPDATE
        );
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

      it("should allow an admin to set an unverified user's alias to something used by another verified user", () =>
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
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_UPDATE
        );
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
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_UPDATE
        );
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
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_UPDATE
        );
      });

      it('should successfully make a non-verified user verified', async () => {
        expect(Bitflags.has(u1.roles, Role.VERIFIED)).toBe(false);

        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { alias: u1.alias, roles: Role.VERIFIED },
          token: adminToken
        });

        const userDB = await prisma.user.findFirst({ where: { id: u1.id } });
        expect(Bitflags.has(userDB.roles, Role.VERIFIED)).toBe(true);
      });

      it('should fail to verify a user if they share alias with another verified user', async () => {
        const imitator = await db.createUser({ data: { alias: u2.alias } });

        expect(Bitflags.has(imitator.roles, Role.VERIFIED)).toBe(false);
        expect(Bitflags.has(u2.roles, Role.VERIFIED)).toBe(true);

        await req.patch({
          url: `admin/users/${imitator.id}`,
          status: 409,
          body: { roles: Role.VERIFIED },
          token: adminToken
        });

        const imitatorDB = await prisma.user.findFirst({
          where: { id: imitator.id }
        });
        const user2DB = await prisma.user.findFirst({ where: { id: u2.id } });
        // Make sure role was not set before throwing 409.
        expect(Bitflags.has(imitatorDB.roles, Role.VERIFIED)).toBe(false);
        expect(Bitflags.has(user2DB.roles, Role.VERIFIED)).toBe(true);
      });

      // Very edge case where the admin is both
      // changing the alias and giving verified role.
      it('should fail to verify and update alias of a user if a verified user shares the new alias', async () => {
        expect(Bitflags.has(u1.roles, Role.VERIFIED)).toBe(false);
        expect(Bitflags.has(u2.roles, Role.VERIFIED)).toBe(true);

        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 409,
          body: { alias: u2.alias, roles: Role.VERIFIED },
          token: adminToken
        });

        const user1DB = await prisma.user.findFirst({ where: { id: u1.id } });
        const user2DB = await prisma.user.findFirst({ where: { id: u2.id } });
        expect(Bitflags.has(user1DB.roles, Role.VERIFIED)).toBe(false);
        expect(Bitflags.has(user2DB.roles, Role.VERIFIED)).toBe(true);
        expect(user1DB.alias).not.toEqual(user2DB.alias);
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
      let admin: User,
        adminToken: string,
        modToken: string,
        u1: User,
        u1Token: string;

      beforeEach(async () => {
        [[admin, adminToken], modToken, [u1, u1Token]] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.createAndLoginUser()
        ]);
      });

      afterEach(() => db.cleanup('leaderboardRun', 'pastRun', 'user'));

      afterAll(() =>
        db.cleanup('mMap', 'report', 'activity', 'deletedUser', 'adminActivity')
      );

      it('should delete user data. leaving user with Role.DELETED', async () => {
        const followeeUser = await db.createUser();
        const map = await db.createMap();

        const steamID = 919191919n;
        const steamIDHash = createHash('sha256')
          .update(steamID.toString())
          .digest('hex');

        const user = await prisma.user.create({
          data: {
            roles: Role.MAPPER,
            bans: Ban.BIO,
            steamID,
            alias: 'User to be deleted',
            avatar: 'yeeeee',
            country: 'NA',
            profile: {
              create: { bio: 'yeeeee', socials: { RandomSocial: 'bemyguest' } }
            },
            userStats: { create: { totalJumps: 100 } },
            submittedMaps: { connect: [{ id: map.id }] },
            mapCredits: {
              create: { type: MapCreditType.AUTHOR, mapID: map.id }
            },
            mapFavorites: { create: { mmap: { connect: { id: map.id } } } },
            reviewsSubmitted: {
              create: {
                mmap: { connect: { id: map.id } },
                mainText: "That's a good map"
              }
            },
            reviewsResolved: {
              create: {
                mmap: { connect: { id: map.id } },
                resolved: true,
                mainText: 'This map sucks',
                reviewer: {
                  connect: {
                    id: followeeUser.id // Whatever, any user is fine
                  }
                }
              }
            },
            follows: {
              create: { followed: { connect: { id: followeeUser.id } } }
            },
            followers: {
              create: { followee: { connect: { id: followeeUser.id } } }
            },
            mapNotifies: {
              create: { mmap: { connect: { id: map.id } }, notifyOn: 8 }
            }
          }
        });

        await db.createPastRun({
          map: map,
          user: user,
          createLbRun: true,
          lbRank: 1
        });
        await prisma.activity.create({
          data: {
            type: ActivityType.MAP_APPROVED,
            data: 123,
            user: { connect: { id: user.id } }
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
            submitter: { connect: { id: user.id } },
            resolver: { connect: { id: user.id } }
          }
        });

        const userBeforeDeletion = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            profile: true,
            userStats: true,
            submittedMaps: true,
            mapCredits: true,
            mapFavorites: true,
            pastRuns: true,
            leaderboardRuns: true,
            reviewsResolved: true,
            reviewsSubmitted: true,
            activities: true,
            follows: true,
            followers: true,
            mapNotifies: true,
            notifications: true,
            reportSubmitted: true,
            reportResolved: true
          }
        });

        await req.del({
          url: `admin/users/${userBeforeDeletion.id}`,
          status: 204,
          token: adminToken
        });

        const deletedUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            profile: true,
            userStats: true,
            submittedMaps: true,
            mapCredits: true,
            mapFavorites: true,
            pastRuns: true,
            leaderboardRuns: true,
            reviewsSubmitted: true,
            reviewsResolved: true,
            activities: true,
            follows: true,
            followers: true,
            mapNotifies: true,
            notifications: true,
            reportSubmitted: true,
            reportResolved: true
          }
        });

        const deletedSteamIDEntry = await prisma.deletedUser.findUnique({
          where: { steamIDHash }
        });

        expect(deletedUser).toMatchObject({
          roles: Role.DELETED,
          bans: userBeforeDeletion.bans,
          steamID: null,
          alias: 'Deleted User',
          avatar: null,
          country: null,
          profile: { bio: '', socials: {} },
          userStats: userBeforeDeletion.userStats,
          submittedMaps: userBeforeDeletion.submittedMaps,
          mapCredits: userBeforeDeletion.mapCredits,
          mapFavorites: [],
          reviewsSubmitted: userBeforeDeletion.reviewsSubmitted,
          activities: [],
          follows: [],
          followers: [],
          mapNotifies: userBeforeDeletion.mapNotifies,
          notifications: [],
          leaderboardRuns: userBeforeDeletion.leaderboardRuns,
          pastRuns: userBeforeDeletion.pastRuns,
          reportSubmitted: userBeforeDeletion.reportSubmitted,
          reportResolved: userBeforeDeletion.reportResolved
        });

        expect(deletedSteamIDEntry).toBeTruthy();
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_DELETE
        );
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
      let modToken: string,
        adminToken: string,
        reviewerToken: string,
        u1: User,
        u1Token: string,
        map1: E2ETestMMap,
        caMap: E2ETestMMap,
        faMap: E2ETestMMap;

      beforeAll(async () => {
        [modToken, adminToken, reviewerToken, [u1, u1Token], [map1]] =
          await Promise.all([
            db.loginNewUser({ data: { roles: Role.MODERATOR } }),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.REVIEWER } }),
            db.createAndLoginUser(),
            db.createMaps(4)
          ]);

        await db.createMap({ status: MapStatus.PRIVATE_TESTING });
        caMap = await db.createMap({ status: MapStatus.CONTENT_APPROVAL });
        faMap = await db.createMap({ status: MapStatus.FINAL_APPROVAL });
        await db.createMap({ status: MapStatus.PUBLIC_TESTING });
        await db.createMap({ status: MapStatus.DISABLED });
      });

      afterAll(() => db.cleanup('leaderboardRun', 'user', 'mMap'));

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'admin/maps',
          status: 200,
          validatePaged: { type: MapDto },
          token: adminToken
        });

        expect(res.body).not.toHaveProperty('zones');
      });

      it('should include maps with any map statuses by default', () =>
        req.get({
          url: 'admin/maps',
          status: 200,
          validatePaged: { type: MapDto, count: 9 },
          token: adminToken
        }));

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
        const map = await db.createMap({ name: 'aaaaa' }, true);

        await req.searchTest({
          url: 'admin/maps',
          token: adminToken,
          searchMethod: 'contains',
          searchString: 'aaaaa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });

        await prisma.mMap.delete({ where: { id: map.id } });
      });

      it('should respond with filtered map data using the submitter id parameter', async () => {
        await prisma.mMap.update({
          where: { id: map1.id },
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
          id: map1.id
        });
      });

      it('should filter by maps when given the filter parameter', async () => {
        const res = await req.get({
          url: 'admin/maps',
          status: 200,
          query: {
            filter: [MapStatus.CONTENT_APPROVAL, MapStatus.FINAL_APPROVAL]
          },
          validatePaged: { type: MapDto, count: 2 },
          token: adminToken
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: caMap.id }),
            expect.objectContaining({ id: faMap.id })
          ])
        );
      });

      it('should return 403 if a regular access token is given', () =>
        req.get({
          url: 'admin/maps',
          status: 403,
          token: u1Token
        }));

      it('should return 403 if a reviewer token is given', () =>
        req.get({
          url: 'admin/maps',
          status: 403,
          token: reviewerToken
        }));

      it('should accept if a mod access token is given', () =>
        req.get({
          url: 'admin/maps',
          status: 200,
          token: modToken
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/maps', 'get'));
    });
  });

  describe('admin/maps/{mapID}', () => {
    describe('PATCH', () => {
      const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
      const vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
      const bspHash = createSha1Hash(bspBuffer);

      let admin: User,
        adminToken: string,
        mod: User,
        modToken: string,
        reviewerToken: string,
        u1: User,
        u1Token: string,
        u2: User,
        u3: User,
        createMapData: Partial<Prisma.MMapCreateInput>;

      beforeAll(async () => {
        [
          [admin, adminToken],
          [mod, modToken],
          reviewerToken,
          [u1, u1Token],
          u2,
          u3
        ] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser({ data: { roles: Role.REVIEWER } }),
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]);

        createMapData = {
          name: 'surf_map',
          submitter: { connect: { id: u1.id } },
          versions: {
            createMany: {
              data: [
                {
                  versionNum: 1,
                  bspHash: createSha1Hash(
                    'apple banana cat dog elephant fox grape hat igloo joker'
                  ),
                  zones: BabyZonesStubString,
                  submitterID: u1.id
                },
                {
                  versionNum: 2,
                  bspHash,
                  zones: BabyZonesStubString,
                  submitterID: u1.id
                }
              ]
            }
          },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              dates: {
                create: [
                  {
                    status: MapStatus.PRIVATE_TESTING,
                    date: new Date(),
                    user: { connect: { id: u1.id } }
                  }
                ]
              },
              suggestions: [
                {
                  gamemode: Gamemode.RJ,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  tier: 1,
                  type: LeaderboardType.IN_SUBMISSION
                }
              ]
            }
          }
        };
      });

      afterAll(() => db.cleanup('leaderboardRun', 'user', 'adminActivity'));

      afterEach(() =>
        Promise.all([
          db.cleanup('mMap', 'adminActivity', 'notification'),
          fileStore.deleteDirectory('maps'),
          fileStore.deleteDirectory('submissions'),
          fileStore.deleteDirectory('maplist')
        ])
      );

      for (const status of Enum.values(MapStatus)) {
        it(`should allow an admin to update map data during ${MapStatus[status]}`, async () => {
          const map = await db.createMap({ ...createMapData, status });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: {
              name: 'surf_dogs',
              info: {
                description:
                  'Dogs are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
                youtubeID: 'Rt460jKi4Bk'
              },
              finalLeaderboards:
                status === MapStatus.FINAL_APPROVAL
                  ? [
                      {
                        gamemode: Gamemode.RJ,
                        trackType: TrackType.MAIN,
                        trackNum: 1,
                        tier: 5,
                        type: LeaderboardType.UNRANKED
                      }
                    ]
                  : undefined,
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            },
            token: adminToken
          });

          const changedMap = await prisma.mMap.findFirst({
            where: { id: map.id },
            include: { info: true, submission: true }
          });

          expect(changedMap).toMatchObject({
            name: 'surf_dogs',
            info: {
              description:
                'Dogs are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
              youtubeID: 'Rt460jKi4Bk'
            },
            submission: {
              suggestions: [
                {
                  trackNum: 1,
                  trackType: TrackType.MAIN,
                  gamemode: Gamemode.RJ,
                  tier: 1,
                  type: LeaderboardType.IN_SUBMISSION
                }
              ],
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            }
          });
          await expectAdminActivityWasCreated(
            admin.id,
            AdminActivityType.MAP_UPDATE
          );
        });

        it(`should allow a mod to update map data during ${MapStatus[status]}`, async () => {
          const map = await db.createMap({ ...createMapData, status });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: {
              name: 'surf_whelks',
              info: {
                description:
                  'Whelks are large flightless dogs. They are the heaviest living dogs, and lay the largest dogs of any living land animal.',
                youtubeID: 'IUfBBCkl_QI'
              },
              finalLeaderboards:
                status === MapStatus.FINAL_APPROVAL
                  ? [
                      {
                        gamemode: Gamemode.RJ,
                        trackType: TrackType.MAIN,
                        trackNum: 1,
                        tier: 5,
                        type: LeaderboardType.UNRANKED
                      }
                    ]
                  : undefined,
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            },
            token: modToken
          });

          const changedMap = await prisma.mMap.findFirst({
            where: { id: map.id },
            include: { info: true, submission: true }
          });

          expect(changedMap).toMatchObject({
            name: 'surf_whelks',
            info: {
              description:
                'Whelks are large flightless dogs. They are the heaviest living dogs, and lay the largest dogs of any living land animal.',
              youtubeID: 'IUfBBCkl_QI'
            },
            submission: {
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            }
          });
          await expectAdminActivityWasCreated(
            mod.id,
            AdminActivityType.MAP_UPDATE
          );
        });

        it(`should not allow a reviewer to update map data during ${MapStatus[status]}`, async () => {
          const map = await db.createMap({ ...createMapData, status });

          await prisma.mMap.update({ where: { id: map.id }, data: { status } });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 403,
            body: {
              name: 'surf_albatross',
              finalLeaderboards:
                status === MapStatus.FINAL_APPROVAL
                  ? [
                      {
                        gamemode: Gamemode.RJ,
                        trackType: TrackType.MAIN,
                        trackNum: 1,
                        tier: 5,
                        type: LeaderboardType.UNRANKED
                      }
                    ]
                  : undefined
            },
            token: reviewerToken
          });
        });

        it('should not allow an admin to update suggestions during submission', async () => {
          const map = await db.createMap({
            ...createMapData,
            status: MapStatus.PUBLIC_TESTING
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 400,
            body: {
              name: 'surf_asbestos',
              suggestions: [
                {
                  trackNum: 1,
                  trackType: TrackType.MAIN,
                  gamemode: Gamemode.BHOP,
                  tier: 1,
                  type: LeaderboardType.UNRANKED
                }
              ]
            },
            token: adminToken
          });
        });
      }

      const statuses = Enum.values(MapStatus);
      //prettier-ignore
      const validChanges = new Set([
        `${MapStatus.APPROVED        },${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.APPROVED        },${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.PRIVATE_TESTING },${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.PRIVATE_TESTING },${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.PUBLIC_TESTING  },${Role.ADMIN}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.PUBLIC_TESTING  },${Role.MODERATOR}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.PUBLIC_TESTING  },${Role.REVIEWER}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.FINAL_APPROVAL  },${Role.MODERATOR}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.FINAL_APPROVAL  },${Role.ADMIN}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.CONTENT_APPROVAL},${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.FINAL_APPROVAL  },${Role.MODERATOR}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.FINAL_APPROVAL  },${Role.ADMIN}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.CONTENT_APPROVAL},${Role.MODERATOR}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.CONTENT_APPROVAL},${Role.ADMIN}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.PUBLIC_TESTING  },${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.FINAL_APPROVAL  },${MapStatus.APPROVED        },${Role.MODERATOR}`,
        `${MapStatus.FINAL_APPROVAL  },${MapStatus.APPROVED        },${Role.ADMIN}`,
        `${MapStatus.FINAL_APPROVAL  },${MapStatus.DISABLED        },${Role.MODERATOR}`,
        `${MapStatus.FINAL_APPROVAL  },${MapStatus.DISABLED        },${Role.ADMIN}`,
        `${MapStatus.DISABLED        },${MapStatus.PRIVATE_TESTING },${Role.ADMIN}`,
        `${MapStatus.DISABLED        },${MapStatus.CONTENT_APPROVAL},${Role.ADMIN}`,
        `${MapStatus.DISABLED        },${MapStatus.PUBLIC_TESTING  },${Role.ADMIN}`,
        `${MapStatus.DISABLED        },${MapStatus.FINAL_APPROVAL  },${Role.ADMIN}`
        // Disabled -> Approved should fail if hasn't been approved once before.
        // This isn't the case for this map, so should fail.
      ]);

      for (const s1 of statuses) {
        for (const s2 of statuses.filter((s) => s !== s1)) {
          for (const role of [Role.MODERATOR, Role.ADMIN, Role.REVIEWER]) {
            const shouldPass = validChanges.has(`${s1},${s2},${role}`);

            it(`should ${shouldPass ? '' : 'not '}allow a ${
              role === Role.ADMIN
                ? 'admin'
                : role === Role.MODERATOR
                  ? 'mod'
                  : 'reviewer'
            } to change a map from ${MapStatus[s1]} to ${
              MapStatus[s2]
            }`, async () => {
              const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));

              const map = await db.createMap({
                ...createMapData,
                versions: {
                  create: {
                    zones: BabyZonesStubString,
                    versionNum: 1,
                    bspHash: createSha1Hash(bspBuffer),
                    submitterID: u1.id
                  }
                },
                status: s1,
                reviews: {
                  createMany: {
                    data: [
                      {
                        mainText: 'h',
                        approves: true,
                        reviewerID: admin.id
                      }
                    ]
                  }
                }
              });

              await prisma.mMap.update({
                where: { id: map.id },
                data: { currentVersionID: map.versions[0].id }
              });

              // Annoying to have to do this for every test but FA -> Approved
              // will throw otherwise.
              await fileStore.add(
                `submissions/${map.versions[0].id}.bsp`,
                bspBuffer
              );

              await req.patch({
                url: `admin/maps/${map.id}`,
                status: shouldPass ? 204 : 403,
                body: {
                  status: s2,
                  finalLeaderboards:
                    s2 === MapStatus.APPROVED
                      ? [
                          {
                            gamemode: Gamemode.RJ,
                            trackNum: 1,
                            trackType: 0,
                            tier: 1,
                            type: LeaderboardType.RANKED
                          }
                        ]
                      : undefined
                },
                token:
                  role === Role.ADMIN
                    ? adminToken
                    : role === Role.MODERATOR
                      ? modToken
                      : reviewerToken
              });

              if (shouldPass) {
                const updatedMap = await prisma.mMap.findUnique({
                  where: { id: map.id }
                });
                expect(updatedMap.status).toBe(s2);
              }
            });
          }
        }
      }

      // Above nonsense tested the inverse of this
      it("should allow an admin to change a map from DISABLED to FINAL APPROVAL if it's been previously approved", async () => {
        const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));

        const map = await db.createMap({
          ...createMapData,
          versions: {
            create: {
              zones: BabyZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(bspBuffer),
              submitterID: u1.id
            }
          },
          status: MapStatus.DISABLED
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            currentVersionID: map.versions[0].id,
            submission: {
              update: {
                dates: {
                  create: [
                    {
                      status: MapStatus.APPROVED,
                      date: new Date(Date.now() - 2000),
                      user: { connect: { id: admin.id } }
                    },
                    {
                      status: MapStatus.DISABLED,
                      date: new Date(Date.now() - 1000),
                      user: { connect: { id: admin.id } }
                    }
                  ]
                }
              }
            }
          }
        });

        // Annoying to have to do this for every test but FA -> Approved
        // will throw otherwise.
        await fileStore.add(`submissions/${map.versions[0].id}.bsp`, bspBuffer);

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.APPROVED,
            finalLeaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackNum: 1,
                trackType: 0,
                tier: 1,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token: adminToken
        });

        const updatedMap = await prisma.mMap.findUnique({
          where: { id: map.id }
        });
        expect(updatedMap.status).toBe(MapStatus.APPROVED);
      });

      it('should create placeholder accounts and wipe placeholder json after map status changed from FA to approved', async () => {
        const bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));

        const map = await db.createMap({
          ...createMapData,
          versions: {
            create: {
              versionNum: 1,
              bspHash: createSha1Hash(bspBuffer),
              zones: BabyZonesStubString,
              submitterID: u1.id
            }
          },
          submission: {
            create: {
              ...createMapData.submission.create,
              placeholders: [
                {
                  type: MapCreditType.CONTRIBUTOR,
                  alias: 'Bungus',
                  description: 'What'
                }
              ]
            }
          },
          status: MapStatus.FINAL_APPROVAL
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { currentVersionID: map.versions[0].id }
        });

        await fileStore.add(`submissions/${map.versions[0].id}.bsp`, bspBuffer);

        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.APPROVED,
            finalLeaderboards: [
              {
                gamemode: Gamemode.RJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                tier: 1,
                type: LeaderboardType.UNRANKED
              }
            ]
          },
          token: adminToken
        });

        const bungus = await prisma.user.findFirst({
          where: { alias: 'Bungus' },
          include: { mapCredits: true }
        });

        expect(bungus).toMatchObject({
          mapCredits: [
            {
              mapID: map.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'What'
            }
          ]
        });

        const submission = await prisma.mapSubmission.findUnique({
          where: { mapID: map.id }
        });
        expect(submission.placeholders).toMatchObject([]);
      });

      it('should delete pending test requests and their notifications changing from PRIVATE_TESTING to DISABLED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING,
          testInvites: {
            createMany: {
              data: [
                {
                  userID: u2.id,
                  state: MapTestInviteState.UNREAD
                },
                {
                  userID: u3.id,
                  state: MapTestInviteState.ACCEPTED
                }
              ]
            }
          }
        });
        await prisma.notification.create({
          data: {
            notifiedUserID: u2.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        });
        await req.patch({
          url: `admin/maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.DISABLED },
          token: adminToken
        });
        const notifs = await prisma.notification.findMany({
          where: {
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id
          }
        });
        expect(notifs).toHaveLength(0);
        const updatedMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { testInvites: true }
        });
        expect(updatedMap.testInvites).toMatchObject([
          { userID: u3.id, state: MapTestInviteState.ACCEPTED }
        ]);
      });

      describe('Map Approval', () => {
        let map: E2ETestMMap;
        const finalLeaderboards = [
          {
            gamemode: Gamemode.RJ,
            trackType: TrackType.MAIN,
            trackNum: 1,
            tier: 5,
            type: LeaderboardType.UNRANKED,
            tags: [MapTag.Sync]
          },
          {
            gamemode: Gamemode.DEFRAG_VQ3,
            trackType: TrackType.BONUS,
            trackNum: 1,
            tier: 5,
            type: LeaderboardType.RANKED,
            tags: [MapTag.Strafe]
          },
          {
            gamemode: Gamemode.DEFRAG_CPM,
            trackType: TrackType.BONUS,
            trackNum: 1,
            type: LeaderboardType.HIDDEN
          }
        ];

        // cleanup for this is done in outer afterEach
        beforeEach(async () => {
          map = await db.createMap({
            ...createMapData,
            versions: {
              createMany: {
                data: [
                  {
                    versionNum: 1,
                    bspHash,
                    zones: ZonesStubString,
                    bspDownloadId: randomUUID(),
                    vmfDownloadId: randomUUID(),
                    submitterID: u1.id
                  },
                  {
                    versionNum: 2,
                    bspHash,
                    zones: ZonesStubString,
                    bspDownloadId: randomUUID(),
                    vmfDownloadId: randomUUID(),
                    submitterID: u1.id
                  }
                ]
              }
            },
            leaderboards: { createMany: { data: [] } },
            status: MapStatus.FINAL_APPROVAL
          });

          const vmfZip = new Zip();
          vmfZip.addFile('map.vmf', vmfBuffer);
          for (const i of [0, 1]) {
            const { bspDownloadId: bspId, vmfDownloadId: vmfId } =
              map.versions[i];
            await fileStore.add(`maps/${vmfId}_VMFs.zip`, vmfZip.toBuffer());
            await fileStore.add(`maps/${bspId}.bsp`, bspBuffer);
          }

          await prisma.leaderboard.createMany({
            data: ZonesStubLeaderboards.map((lb) => ({
              mapID: map.id,
              style: 0,
              type: LeaderboardType.IN_SUBMISSION,
              ...lb
            }))
          });
        });

        it('should delete old version files after map status changed from FA to approved', async () => {
          const bspHash = createSha1Hash(bspBuffer);
          const vmfHash = createSha1Hash(vmfBuffer);

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          const updatedMap = await prisma.mMap.findUnique({
            where: { id: map.id },
            include: { currentVersion: true, versions: true }
          });

          expect(updatedMap).toMatchObject({
            status: MapStatus.APPROVED,
            currentVersion: { bspHash, versionNum: 2 }
          });

          const { bspDownloadId: bspId1, vmfDownloadId: vmfId1 } =
            map.versions[0];
          const { bspDownloadId: bspId2, vmfDownloadId: vmfId2 } =
            map.versions[1];
          expect(await fileStore.exists(`maps/${bspId1}.bsp`)).toBeFalsy();
          expect(await fileStore.exists(`maps/${vmfId1}_VMFs.zip`)).toBeFalsy();

          expect(
            createSha1Hash(await fileStore.get(`maps/${bspId2}.bsp`))
          ).toBe(bspHash);
          expect(
            createSha1Hash(
              new Zip(await fileStore.get(`maps/${vmfId2}_VMFs.zip`))
                .getEntry('map.vmf')
                .getData()
            )
          ).toBe(vmfHash);
        });

        it('should create MAP_APPROVED activities for authors after map status changed from FA to approved', async () => {
          await prisma.mapCredit.createMany({
            data: [
              { type: MapCreditType.AUTHOR, mapID: map.id, userID: u1.id },
              { type: MapCreditType.AUTHOR, mapID: map.id, userID: admin.id },
              { type: MapCreditType.AUTHOR, mapID: map.id, userID: mod.id }
            ]
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          const mapApprovedActvities = await prisma.activity.findMany({
            where: { type: ActivityType.MAP_APPROVED, data: map.id }
          });

          expect(mapApprovedActvities).toHaveLength(3);
          expect(
            mapApprovedActvities.map((activity) => activity.userID).sort()
          ).toEqual([u1.id, admin.id, mod.id].sort());
        });

        it('should send a notification to the map submitter on approval', async () => {
          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          const notifs = await prisma.notification.findMany({
            where: { mapID: map.id, type: NotificationType.MAP_STATUS_CHANGE }
          });
          expect(notifs.length).toBe(1);
          expect(notifs[0]).toMatchObject({
            notifiedUserID: map.submitterID,
            userID: admin.id,
            json: {
              oldStatus: MapStatus.FINAL_APPROVAL,
              newStatus: MapStatus.APPROVED
            }
          });
        });

        it('should create leaderboards based on finalLeaderboards and clear all existing', async () => {
          await db.createLbRun({
            map,
            user: u1,
            rank: 1,
            gamemode: Gamemode.RJ,
            trackType: TrackType.MAIN,
            trackNum: 1
          });

          await db.createLbRun({
            map,
            user: u1,
            rank: 1,
            gamemode: Gamemode.CONC,
            trackType: TrackType.MAIN,
            trackNum: 1
          });

          expect(
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id, gamemode: Gamemode.RJ }
            })
          ).toHaveLength(1);

          expect(
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id, gamemode: Gamemode.CONC }
            })
          ).toHaveLength(1);

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          const leaderboards = await prisma.leaderboard.findMany({
            where: { mapID: map.id }
          });
          expect(leaderboards).toEqual(
            expect.arrayContaining([
              {
                mapID: map.id,
                gamemode: Gamemode.RJ,
                trackType: TrackType.MAIN,
                trackNum: 1,
                linear: false,
                style: 0,
                tier: 5,
                type: LeaderboardType.UNRANKED,
                tags: [MapTag.Sync]
              },
              {
                mapID: map.id,
                gamemode: Gamemode.RJ,
                trackType: TrackType.STAGE,
                trackNum: 1,
                linear: null,
                tier: null,
                type: LeaderboardType.UNRANKED,
                style: 0,
                tags: []
              },
              {
                mapID: map.id,
                gamemode: Gamemode.RJ,
                trackType: TrackType.STAGE,
                trackNum: 2,
                linear: null,
                tier: null,
                type: LeaderboardType.UNRANKED,
                style: 0,
                tags: []
              },
              {
                mapID: map.id,
                gamemode: Gamemode.DEFRAG_VQ3,
                trackType: TrackType.BONUS,
                trackNum: 1,
                linear: null,
                tier: 5,
                type: LeaderboardType.RANKED,
                style: 0,
                tags: [MapTag.Strafe]
              },
              {
                mapID: map.id,
                gamemode: Gamemode.DEFRAG_CPM,
                trackType: TrackType.BONUS,
                trackNum: 1,
                linear: null,
                tier: null,
                type: LeaderboardType.HIDDEN,
                style: 0,
                tags: []
              }
            ])
          );

          expect(leaderboards).toHaveLength(5);

          expect(
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id, gamemode: Gamemode.RJ }
            })
          ).toHaveLength(0);

          expect(
            await prisma.leaderboardRun.findMany({
              where: { mapID: map.id, gamemode: Gamemode.CONC }
            })
          ).toHaveLength(0);
        });

        it('should 400 if map has unresolved reviews', async () => {
          await prisma.mapReview.create({
            data: {
              resolved: false,
              mainText:
                'I hated this map. ' +
                'Hated hated hated hated hated this map. Hated it. ' +
                'Hated every simpering stupid vacant player-insulting stage of it',
              imageIDs: ['1'],
              mmap: { connect: { id: map.id } },
              reviewer: { connect: { id: mod.id } }
            }
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 400,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });
        });

        it('should succeed if map has resolved=null reviews', async () => {
          await prisma.mapReview.create({
            data: {
              resolved: null,
              mainText:
                'Was there no one connected with this project who read the ' +
                'screenplay, considered the story, evaluated the proposed map and vomited?',
              imageIDs: ['1'],
              mmap: { connect: { id: map.id } },
              reviewer: { connect: { id: mod.id } }
            }
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });
        });

        it('should generate new map list version files', async () => {
          // This is just stored in memory so we can't test this without calling
          // another endpoint. In future we could probably just peer inside of
          // Redis.
          const oldVersion = await req.get({
            url: 'maps/maplistversion',
            status: 200,
            token: adminToken
          });

          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 204,
            body: { status: MapStatus.APPROVED, finalLeaderboards },
            token: adminToken
          });

          await checkScheduledMapListUpdates();

          const newVersion = await req.get({
            url: 'maps/maplistversion',
            status: 200,
            token: adminToken
          });

          expect(newVersion.body.approved).toBe(oldVersion.body.approved + 1);
          expect(newVersion.body.submissions).toBe(
            oldVersion.body.submissions + 1
          );

          const approved = await fileStore.getMapListVersion(
            FlatMapList.APPROVED,
            newVersion.body.approved
          );
          expect(approved.ident).toBe('MSML');
          expect(approved.numMaps).toBe(1);
          expect(approved.data).toHaveLength(1);
          expect(approved.data[0]).toMatchObject({
            id: map.id,
            leaderboards: expect.anything(),
            info: expect.anything()
          });
          expect(approved.data[0]).not.toHaveProperty('zones');

          const submission = await fileStore.getMapListVersion(
            FlatMapList.SUBMISSION,
            newVersion.body.submissions
          );
          expect(submission.ident).toBe('MSML');
          expect(submission.numMaps).toBe(0);
          expect(submission.data).toHaveLength(0);
        });

        it('should 400 when moving from FA to approved if leaderboards are not provided', async () => {
          await req.patch({
            url: `admin/maps/${map.id}`,
            status: 400,
            body: { status: MapStatus.APPROVED },
            token: adminToken
          });
        });
      });

      it('should generate a new map list version file without the map when the map gets disabled', async () => {
        const oldVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: adminToken
        });

        const map1 = await db.createMap({
          ...createMapData,
          status: MapStatus.APPROVED
        });

        const map2 = await db.createMap({
          ...createMapData,
          name: 'surf_thisfileistoobig',
          status: MapStatus.APPROVED
        });

        await req.patch({
          url: `admin/maps/${map1.id}`,
          status: 204,
          body: { status: MapStatus.DISABLED },
          token: adminToken
        });

        await checkScheduledMapListUpdates();

        const newVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: adminToken
        });

        expect(newVersion.body.submissions).toBe(oldVersion.body.submissions);
        expect(newVersion.body.approved).toBe(oldVersion.body.approved + 1);

        const { ident, numMaps, data } = await fileStore.getMapListVersion(
          FlatMapList.APPROVED,
          newVersion.body.approved
        );
        expect(ident).toBe('MSML');
        expect(numMaps).toBe(1);
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(map2.id);
      });

      it('should return 404 if map not found', () =>
        req.patch({
          url: `admin/maps/${NULL_ID}`,
          status: 404,
          body: { status: MapStatus.PUBLIC_TESTING },
          token: adminToken
        }));

      it('should return 403 for a non-admin/mod/reviewer access token is given', () =>
        req.patch({
          url: `admin/maps/${NULL_ID}`,
          status: 403,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/maps/1', 'patch'));
    });

    describe('DELETE', () => {
      let modToken: string,
        admin: User,
        adminToken: string,
        user: User,
        token: string,
        map: E2ETestMMap;

      beforeAll(async () => {
        [modToken, [admin, adminToken], [user, token]] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser({ data: { roles: Role.MAPPER } })
        ]);
      });

      afterAll(() =>
        db.cleanup('leaderboardRun', 'user', 'mMap', 'adminActivity')
      );

      beforeEach(async () => {
        map = await db.createMap({
          name: 'surf_bork',
          status: MapStatus.CONTENT_APPROVAL,
          submitter: { connect: { id: user.id } },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspDownloadId: db.uuid(),
              vmfDownloadId: db.uuid(),
              bspHash: createSha1Hash(Buffer.from('buffer fish')),
              submitter: { connect: { id: user.id } }
            }
          }
        });
      });

      afterEach(() =>
        Promise.all([db.cleanup('mMap'), fileStore.deleteDirectory('/maplist')])
      );

      it('should completely delete the map and related stored data if map was never approved', async () => {
        const imgID = db.uuid();
        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [imgID] }
        });

        await fileStore.add(
          bspPath(map.currentVersion.bspDownloadId),
          readFileSync(__dirname + '/../files/map.bsp')
        );

        await fileStore.add(
          vmfsPath(map.currentVersion.vmfDownloadId),
          Buffer.from('bup')
        );

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          await fileStore.add(
            sizePath(imgID),
            readFileSync(__dirname + '/../files/image_jpg.jpg')
          );
        }

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          expect(await fileStore.exists(sizePath(imgID))).toBeTruthy();
        }

        const run = await db.createLbRun({
          map: map,
          user,
          time: 1,
          rank: 1
        });
        await fileStore.add(runPath(run.replayHash), Buffer.alloc(123));

        await req.del({
          url: `admin/maps/${map.id}`,
          status: 204,
          token: adminToken
        });

        const updated = await prisma.mMap.findFirst({
          where: { id: map.id }
        });
        const versions = await prisma.mapVersion.findMany({
          where: { mapID: map.id }
        });

        expect(updated).toBeNull();
        expect(versions).toHaveLength(0);
        expect(
          await fileStore.exists(bspPath(map.currentVersion.bspDownloadId))
        ).toBeFalsy();
        expect(
          await fileStore.exists(vmfsPath(map.currentVersion.vmfDownloadId))
        ).toBeFalsy();

        const relatedRuns = await prisma.leaderboardRun.findMany({
          where: { mapID: map.id }
        });
        expect(relatedRuns).toHaveLength(0);
        expect(await fileStore.exists(runPath(run.replayHash))).toBeFalsy();

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          expect(await fileStore.exists(sizePath(imgID))).toBeFalsy();
        }

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.MAP_CONTENT_DELETE
        );
      });

      it('should successfully disable the map and related files if map was approved', async () => {
        await prisma.mapInfo.update({
          where: { mapID: map.id },
          data: { approvedDate: new Date() }
        });

        const imgID = db.uuid();
        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [imgID], status: MapStatus.APPROVED }
        });

        await fileStore.add(
          bspPath(map.currentVersion.bspDownloadId),
          readFileSync(__dirname + '/../files/map.bsp')
        );

        await fileStore.add(
          vmfsPath(map.currentVersion.vmfDownloadId),
          Buffer.from('bup')
        );

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          await fileStore.add(
            sizePath(imgID),
            readFileSync(__dirname + '/../files/image_jpg.jpg')
          );
        }

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          expect(await fileStore.exists(sizePath(imgID))).toBeTruthy();
        }

        const run = await db.createLbRun({
          map: map,
          user,
          time: 1,
          rank: 1
        });
        await fileStore.add(runPath(run.replayHash), Buffer.alloc(123));

        await req.del({
          url: `admin/maps/${map.id}`,
          status: 204,
          token: adminToken
        });

        const updated = await prisma.mMap.findFirst({
          where: { id: map.id },
          include: { versions: { orderBy: { versionNum: 'asc' } } }
        });

        expect(updated.status).toBe(MapStatus.DISABLED);
        expect(updated.versions.at(-1).bspHash).toBeNull();
        expect(updated.versions.at(-1).bspDownloadId).toBeNull();
        expect(updated.versions.at(-1).vmfDownloadId).toBeNull();
        expect(
          await fileStore.exists(bspPath(map.currentVersion.bspDownloadId))
        ).toBeFalsy();
        expect(
          await fileStore.exists(vmfsPath(map.currentVersion.vmfDownloadId))
        ).toBeFalsy();

        // We used to delete these, check we don't anymore
        const relatedRuns = await prisma.leaderboardRun.findMany({
          where: { mapID: map.id }
        });
        expect(relatedRuns).toHaveLength(1);
        expect(await fileStore.exists(runPath(run.replayHash))).toBeTruthy();

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          expect(await fileStore.exists(sizePath(imgID))).toBeFalsy();
        }

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.MAP_CONTENT_DELETE
        );
      });

      it('should update the map list version', async () => {
        await checkScheduledMapListUpdates();

        await prisma.mapInfo.update({
          where: { mapID: map.id },
          data: { approvedDate: new Date() }
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        const oldVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: adminToken
        });

        await req.del({
          url: `admin/maps/${map.id}`,
          status: 204,
          token: adminToken
        });

        await checkScheduledMapListUpdates();

        const newVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: adminToken
        });

        expect(newVersion.body.submissions).toBe(oldVersion.body.submissions);
        expect(newVersion.body.approved).toBe(oldVersion.body.approved + 1);

        const { ident, numMaps, data } = await fileStore.getMapListVersion(
          FlatMapList.APPROVED,
          newVersion.body.approved
        );
        expect(ident).toBe('MSML');
        expect(numMaps).toBe(0);
        expect(data).toHaveLength(0);
      });

      it('should return 404 if map not found', () =>
        req.del({
          url: `admin/maps/${NULL_ID}`,
          status: 404,
          token: adminToken
        }));

      it('should return 403 if a non admin access token is given', () =>
        req.del({
          url: `admin/maps/${map.id}`,
          status: 403,
          token: token
        }));

      it('should return 403 if a mod access token is given', () =>
        req.del({
          url: `admin/maps/${map.id}`,
          status: 403,
          token: modToken
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/maps/1', 'del'));
    });
  });

  describe('admin/map-review/{reviewID}', () => {
    describe('PATCH', () => {
      let u1: User,
        u1Token: string,
        adminToken: string,
        modToken: string,
        reviewerToken: string,
        map: MMap,
        review: MapReview;

      beforeAll(async () => {
        [[u1, u1Token], adminToken, modToken, reviewerToken] =
          await Promise.all([
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.MODERATOR } }),
            db.loginNewUser({ data: { roles: Role.REVIEWER } })
          ]);

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      beforeEach(async () => {
        review = await prisma.mapReview.create({
          data: {
            mainText: 'im sick today so cba to think of silly messages',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.AHOP,
                tier: 10,
                gameplayRating: 1
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u1.id } },
            resolved: false
          }
        });
      });

      afterEach(() => db.cleanup('mapReview'));

      it('should allow admin to update resolved status', async () => {
        const res = await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 200,
          body: { resolved: true },
          validate: MapReviewDto,
          token: adminToken
        });

        expect(res.body.resolved).toBe(true);
      });

      it('should allow mod to update resolved status', async () => {
        const res = await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 200,
          body: { resolved: true },
          validate: MapReviewDto,
          token: modToken
        });

        expect(res.body.resolved).toBe(true);
      });

      it('should allow reviewer to update resolved status', async () => {
        const res = await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 200,
          body: { resolved: true },
          validate: MapReviewDto,
          token: reviewerToken
        });

        expect(res.body.resolved).toBe(true);
      });

      it('should not allow admin to update approved status', () =>
        req.patch({
          url: `admin/map-review/${review.id}`,
          status: 400, // 400s since does even exist on dto
          body: { approves: true },
          token: adminToken
        }));

      it('should not allow review author to access', () =>
        req.patch({
          url: `admin/map-review/${review.id}`,
          status: 403,
          body: { resolved: true },
          token: u1Token
        }));

      it('should 400 for bad update data', () =>
        req.patch({
          url: `admin/map-review/${review.id}`,
          status: 400,
          body: { mainText: "admins cant rewrite people's reviews" },
          token: adminToken
        }));

      it('should return 404 for missing review', () =>
        req.patch({
          url: `admin/map-review/${NULL_ID}`,
          status: 404,
          body: { resolved: true },
          token: adminToken
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/map-review/1', 'patch'));
    });

    describe('DELETE', () => {
      let u1: User,
        u1Token: string,
        adminToken: string,
        modToken: string,
        reviewerToken: string,
        map: MMap,
        review: MapReview;
      const assetPath = mapReviewAssetPath('1');

      beforeAll(async () => {
        [[u1, u1Token], adminToken, modToken, reviewerToken] =
          await Promise.all([
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.MODERATOR } }),
            db.loginNewUser({ data: { roles: Role.REVIEWER } })
          ]);

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      beforeEach(async () => {
        review = await prisma.mapReview.create({
          data: {
            mainText: 'auuaghauguhhh!!',
            imageIDs: ['1'],
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.AHOP,
                tier: 10,
                gameplayRating: 1
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u1.id } },
            resolved: false
          }
        });

        await fileStore.add(assetPath, Buffer.alloc(1024));
      });

      afterEach(() => db.cleanup('mapReview'));

      it('should allow an admin to delete a map review', async () => {
        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 204,
          token: adminToken
        });

        expect(
          await prisma.mapReview.findUnique({ where: { id: review.id } })
        ).toBeNull();
      });

      it('should delete any stored assets', async () => {
        expect(await fileStore.exists(assetPath)).toBe(true);

        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 204,
          token: adminToken
        });

        expect(await fileStore.exists(assetPath)).toBe(false);
      });

      it('should allow a mod to delete a map review', async () => {
        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 204,
          token: modToken
        });

        expect(
          await prisma.mapReview.findUnique({ where: { id: review.id } })
        ).toBeNull();
      });

      it('should not allow a reviewer to delete a map review', async () => {
        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 403,
          token: reviewerToken
        });
      });

      it('should not allow review author to delete a map review (via this endpoint)', () =>
        req.del({
          url: `admin/map-review/${review.id}`,
          status: 403,
          token: u1Token
        }));

      it('should return 404 for missing review', () =>
        req.del({
          url: `admin/map-review/${NULL_ID}`,
          status: 404,
          token: adminToken
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/map-review/1', 'del'));
    });
  });

  describe('admin/reports', () => {
    describe('GET', () => {
      let adminToken: string,
        u1: User,
        u1Token: string,
        r1: Report,
        _r2: Report;

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
      let admin: User,
        adminToken: string,
        u1: User,
        u1Token: string,
        r1: Report,
        _r2: Report;

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

      afterEach(() => db.cleanup('user', 'report', 'adminActivity'));

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
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.REPORT_RESOLVE
        );
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

  describe('admin/activities', () => {
    describe('GET', () => {
      let admin: User, adminToken: string, mod: User, u1: User, u1Token: string;
      beforeAll(async () => {
        [[admin, adminToken], mod, [u1, u1Token]] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createUser({ data: { roles: Role.MODERATOR } }),
          db.createAndLoginUser()
        ]);

        // Seperate creates for different createdAt
        await prisma.adminActivity.create({
          data: {
            type: AdminActivityType.MAP_UPDATE,
            target: 1,
            oldData: {},
            newData: { someData: 'yes' },
            user: { connect: { id: admin.id } }
          }
        });
        await prisma.adminActivity.create({
          data: {
            type: AdminActivityType.USER_UPDATE,
            target: u1.id,
            oldData: {},
            newData: { profile: { alias: 'yes' } },
            user: { connect: { id: mod.id } }
          }
        });
        await prisma.adminActivity.create({
          data: {
            type: AdminActivityType.USER_DELETE,
            target: u1.id,
            oldData: {},
            newData: { roles: Role.DELETED },
            user: { connect: { id: admin.id } }
          }
        });
      });

      afterAll(() => db.cleanup('user', 'adminActivity'));

      it('should return a list of all sorted admin activities', async () => {
        const adminActivities = await req.get({
          url: 'admin/activities',
          status: 200,
          token: adminToken,
          validatePaged: { type: AdminActivityDto, count: 3 }
        });

        expect(adminActivities.body).toHaveProperty('data');

        expect(adminActivities.body.data[0].type).toEqual(
          AdminActivityType.USER_DELETE
        );
        expect(adminActivities.body.data[1].type).toEqual(
          AdminActivityType.USER_UPDATE
        );
      });

      it('should return a filtered list of all admin activities', async () => {
        const adminActivities = await req.get({
          url: 'admin/activities',
          status: 200,
          token: adminToken,
          query: {
            filter: [
              AdminActivityType.MAP_UPDATE,
              AdminActivityType.USER_UPDATE
            ]
          },
          validatePaged: { type: AdminActivityDto, count: 2 }
        });

        expect(adminActivities.body).toHaveProperty('data');

        expect(adminActivities.body.data[0].type).toEqual(
          AdminActivityType.USER_UPDATE
        );
        expect(adminActivities.body.data[1].type).toEqual(
          AdminActivityType.MAP_UPDATE
        );
      });

      it('should 403 when the user tries to get admin activities', () =>
        req.get({
          url: 'admin/activities',
          status: 403,
          token: u1Token
        }));

      it('should 403 when no access token is provided', () =>
        req.unauthorizedTest('admin/activities', 'get'));
    });
  });

  describe('admin/activities/{adminID}', () => {
    describe('GET', () => {
      let admin: User, adminToken: string, u1: User, u1Token: string;
      beforeAll(async () => {
        [[admin, adminToken], [u1, u1Token]] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser()
        ]);
      });

      afterAll(() => db.cleanup('user', 'adminActivity'));

      it('should return a list of admin activities', async () => {
        const oldUser = await prisma.user.findUnique({
          where: { id: u1.id },
          include: { profile: true }
        });

        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { alias: 'Update Alias' },
          token: adminToken
        });

        const newUser = await prisma.user.findUnique({
          where: { id: u1.id },
          include: { profile: true }
        });

        const adminActivities = await req.get({
          url: 'admin/activities/' + admin.id,
          status: 200,
          token: adminToken,
          validatePaged: { type: AdminActivityDto, count: 1 }
        });

        expect(adminActivities.body).toHaveProperty('data');

        const userUpdateActivity = adminActivities.body.data.find(
          (activity) => activity.type == AdminActivityType.USER_UPDATE
        );

        expect(userUpdateActivity.oldData).toEqual(
          JSON.parse(JSON.stringify(oldUser)) // To convert object to format from the request (For example: convert dates and bigints to strings)
        );
        expect(userUpdateActivity.newData).toEqual(
          JSON.parse(JSON.stringify(newUser))
        );
        expect(userUpdateActivity.target).toBe(oldUser.id);
      });

      it('should 403 when the user tries to get admin activities', () =>
        req.get({
          url: 'admin/activities/' + admin.id,
          status: 403,
          token: u1Token
        }));

      it('should 403 when no access token is provided', () =>
        req.unauthorizedTest('admin/activities/' + admin.id, 'get'));
    });
  });

  describe('admin/killswitch', () => {
    describe('GET', () => {
      let adminToken: string, modToken: string, u1Token: string;
      beforeAll(async () => {
        [adminToken, modToken, u1Token] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser()
        ]);
      });

      afterAll(() => db.cleanup('user', 'adminActivity'));

      it('should respond with all killswitches', async () => {
        const response = await req.get({
          url: 'admin/killswitch',
          status: 200,
          token: adminToken
        });

        const killswitches = Object.fromEntries(
          Enum.values(KillswitchType).map((type: KillswitchType) => [
            type,
            false
          ])
        ) as Killswitches;

        expect(response.body).toEqual(killswitches);
      });

      it('should 403 for moderators', async () => {
        await req.get({
          url: 'admin/killswitch',
          status: 403,
          token: modToken
        });
      });

      it('should respond with unauthorized', async () => {
        await req.get({
          url: 'admin/killswitch',
          status: 403,
          token: u1Token
        });
      });
    });

    describe('PATCH', () => {
      let adminToken: string, modToken: string, u1Token: string;
      beforeAll(async () => {
        [adminToken, modToken, u1Token] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser()
        ]);
      });

      afterAll(() => db.cleanup('user', 'adminActivity', 'config'));

      it('should allow admin to patch killswitches', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_SUBMISSION: true
          },
          token: adminToken
        });
      });

      it('should allow admin to patch multiple killswitches', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            NEW_SIGNUPS: true,
            MAP_SUBMISSION: true
          },
          token: adminToken
        });
      });

      it('should not allow admins to patch incorrect killswitches', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 400,
          body: {
            FAKE_SWITCH: true
          },
          token: adminToken
        });
      });

      it('should fail if killswitch value is not a boolean', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 400,
          body: {
            MAP_SUBMISSION: 'this is a test'
          },
          token: adminToken
        });
      });

      it('should fail if one killswitch is valid and one not', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 400,
          body: {
            NEW_SIGNUPS: true,
            MAP_SUBMISSION: 'this is a test'
          },
          token: adminToken
        });
      });

      it('should 403 for moderators', async () => {
        await req.get({
          url: 'admin/killswitch',
          status: 403,
          token: modToken
        });
      });

      it('should respond with unauthorized', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 403,
          body: {
            MAP_SUBMISSION: true
          },
          token: u1Token
        });
      });
    });
  });

  describe('admin/announcement', () => {
    describe('POST', () => {
      let adminToken: string, modToken: string, u1Token: string;
      beforeAll(async () => {
        [adminToken, modToken, u1Token] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser()
        ]);
      });

      afterEach(() => db.cleanup('notification'));
      afterAll(() => db.cleanup('user'));

      it('should post an announcement to all users', async () => {
        const horseTime = "It's Horse Time!";
        await req.post({
          url: 'admin/announcement',
          status: 201,
          body: { message: horseTime },
          token: adminToken
        });

        const [userCount, notificationsCount] = await Promise.all([
          prisma.user.count(),
          prisma.notification.count({
            where: {
              type: NotificationType.ANNOUNCEMENT,
              json: {
                path: ['message'],
                equals: horseTime
              }
            }
          })
        ]);
        expect(notificationsCount).toBe(userCount);
      });

      it('should 403 for moderators', async () => {
        await req.post({
          url: 'admin/announcement',
          status: 403,
          body: { message: "It's Horse Time!" },
          token: modToken
        });
      });

      it('should 403 for regular users', async () => {
        await req.post({
          url: 'admin/announcement',
          status: 403,
          body: { message: "It's Horse Time!" },
          token: u1Token
        });
      });
    });
  });
});
