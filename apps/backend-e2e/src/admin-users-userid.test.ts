import { after, afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  ActivityType,
  AdminActivityType,
  Ban,
  MapCreditType,
  ReportCategory,
  ReportType,
  Role
} from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import { User } from '@momentum/db';
import { createHash } from 'node:crypto';
import {
  prisma,
  req,
  db,
  auth,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  async function expectAdminActivityWasCreated(
    userID: number,
    type: AdminActivityType
  ) {
    const activities = await prisma.adminActivity.findMany({
      where: { userID }
    });
    assert.ok(activities.some((activity) => activity.type === type));
  }

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
          db.createAndLoginUser({ data: { realAlias: 'JoeFromAccounting' } }),
          db.createUser({
            data: { roles: Role.VERIFIED, realAlias: 'DanTheMan' }
          }),
          db.createUser({ data: { roles: Role.VERIFIED, realAlias: 'jef' } })
        ]);

        adminGameToken = auth.gameLogin(admin);
      });

      afterEach(async () => {
        await db.cleanup('adminActivity');
      });

      after(async () => {
        await db.cleanup('user');
      });

      it("should successfully update a specific user's alias", async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { customAlias: 'Barry 2' },
          token: adminToken
        });

        const res = await req.get({
          url: `users/${u1.id}`,
          status: 200,
          token: adminToken
        });

        assert.equal(res.body.alias, 'Barry 2');
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_UPDATE
        );
      });

      it("should 409 when an admin tries to set a verified user's alias to something used by another verified user", async () => {
        await req.patch({
          url: `admin/users/${u2.id}`,
          status: 409,
          body: { customAlias: u3.alias },
          token: adminToken
        });
      });

      it("should allow an admin to set a verified user's alias to something used by another unverified user", async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { customAlias: mod.alias },
          token: adminToken
        });
      });

      it("should allow an admin to set an unverified user's alias to something used by another verified user", async () => {
        await req.patch({
          url: `admin/users/${mod.id}`,
          status: 204,
          body: { customAlias: u2.alias },
          token: adminToken
        });
      });

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

        assert.equal(res.body.bio, bio);
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

        assert.equal(userDB.bans, bans);
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

        assert.equal(Bitflags.has(userDB.roles, Role.MAPPER), true);
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_UPDATE
        );
      });

      it('should successfully make a non-verified user verified', async () => {
        assert.equal(Bitflags.has(u1.roles, Role.VERIFIED), false);

        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { customAlias: u1.alias, roles: Role.VERIFIED },
          token: adminToken
        });

        const userDB = await prisma.user.findFirst({ where: { id: u1.id } });
        assert.equal(Bitflags.has(userDB.roles, Role.VERIFIED), true);
      });

      it('should fail to verify a user if they share alias with another verified user', async () => {
        const imitator = await db.createUser({ data: { realAlias: u2.alias } });

        assert.equal(Bitflags.has(imitator.roles, Role.VERIFIED), false);
        assert.equal(Bitflags.has(u2.roles, Role.VERIFIED), true);

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
        assert.equal(Bitflags.has(imitatorDB.roles, Role.VERIFIED), false);
        assert.equal(Bitflags.has(user2DB.roles, Role.VERIFIED), true);
      });

      // Very edge case where the admin is both
      // changing the alias and giving verified role.
      it('should fail to verify and update alias of a user if a verified user shares the new alias', async () => {
        assert.equal(Bitflags.has(u1.roles, Role.VERIFIED), false);
        assert.equal(Bitflags.has(u2.roles, Role.VERIFIED), true);

        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 409,
          body: { customAlias: u2.alias, roles: Role.VERIFIED },
          token: adminToken
        });

        const user1DB = await prisma.user.findFirst({ where: { id: u1.id } });
        const user2DB = await prisma.user.findFirst({ where: { id: u2.id } });
        assert.equal(Bitflags.has(user1DB.roles, Role.VERIFIED), false);
        assert.equal(Bitflags.has(user2DB.roles, Role.VERIFIED), true);
        assert.notDeepEqual(user1DB.alias, user2DB.alias);
      });

      it('should allow an admin to make a regular user a moderator', async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { roles: Role.MODERATOR },
          token: adminToken
        });
      });

      it("should allow an admin to update a moderator's roles", async () => {
        await req.patch({
          url: `admin/users/${mod.id}`,
          status: 204,
          body: { roles: Role.MAPPER },
          token: adminToken
        });
      });

      it('should allow an admin to remove a user as moderator', async () => {
        await req.patch({
          url: `admin/users/${mod.id}`,
          status: 204,
          body: { roles: 0 },
          token: adminToken
        });
      });

      it("should not allow an admin to update another admin's roles", async () => {
        await req.patch({
          url: `admin/users/${admin2.id}`,
          status: 403,
          body: { roles: Role.MAPPER },
          token: adminToken
        });
      });

      it('should allow an admin to update their own non-admin roles', async () => {
        await req.patch({
          url: `admin/users/${admin.id}`,
          status: 204,
          body: { roles: Role.MAPPER },
          token: adminToken
        });
      });

      it('should allow an admin to update their own moderator role', async () => {
        await req.patch({
          url: `admin/users/${admin.id}`,
          status: 204,
          body: { roles: Role.MODERATOR },
          token: adminToken
        });
      });

      it('should allow an admin to update their own admin role', async () => {
        await req.patch({
          url: `admin/users/${admin.id}`,
          status: 204,
          body: { roles: 0 },
          token: adminToken
        });
      });

      it("should successfully allow a moderator to update a specific user's roles", async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { roles: Role.MAPPER },
          token: modToken
        });
      });

      it('should not allow a moderator to make another user a moderator', async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 403,
          body: { roles: Role.MODERATOR },
          token: modToken
        });
      });

      it("should not allow a moderator to update another moderator's roles", async () => {
        await req.patch({
          url: `admin/users/${mod2.id}`,
          status: 403,
          body: { roles: 0 },
          token: modToken
        });
      });

      it("should not allow a moderator to update an admin's roles", async () => {
        await req.patch({
          url: `admin/users/${admin2.id}`,
          status: 403,
          body: { roles: Role.MAPPER },
          token: modToken
        });
      });

      it('should allow a moderator to update their own non-mod roles', async () => {
        await req.patch({
          url: `admin/users/${mod.id}`,
          status: 204,
          body: { roles: Bitflags.join(Role.MAPPER, Role.MODERATOR) },
          token: modToken
        });
      });

      it('should not allow a moderator to update their own mod role', async () => {
        await req.patch({
          url: `admin/users/${mod.id}`,
          status: 403,
          body: { roles: 0 },
          token: modToken
        });
      });

      it('should 403 when the user requesting is not an admin', async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 403,
          body: { customAlias: 'Barry 2' },
          token: u1Token
        });
      });

      it('should 403 when authenticated from game', async () => {
        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 403,
          body: { roles: Role.MAPPER },
          token: adminGameToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.patch({ url: `admin/users/${u1.id}`, status: 401 });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/users/1', 'patch');
      });
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

      afterEach(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user');
      });

      after(async () => {
        await db.cleanup(
          'mMap',
          'report',
          'activity',
          'deletedUser',
          'adminActivity'
        );
      });

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
            realAlias: 'User to be deleted',
            customAlias: 'Custom alias to be deleted',
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

        assert.partialDeepStrictEqual(deletedUser, {
          roles: Role.DELETED,
          bans: userBeforeDeletion.bans,
          steamID: null,
          customAlias: null,
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

        assert.ok(deletedSteamIDEntry);
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_DELETE
        );
      });

      it('should 403 when the user requesting only is a moderator', async () => {
        await req.del({
          url: `admin/users/${u1.id}`,
          status: 403,
          token: modToken
        });
      });

      it('should 403 when the user requesting is not an admin', async () => {
        await req.del({
          url: `admin/users/${u1.id}`,
          status: 403,
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.del({ url: `admin/users/${u1.id}`, status: 401 });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/users/1', 'del');
      });
    });
  });
});
