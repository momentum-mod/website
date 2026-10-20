import { mock, after, before, beforeEach, describe, it } from 'node:test';

import {
  assertValidDto,
  AuthUtil,
  DbUtil,
  futureDateOffset,
  NULL_ID,
  randomString,
  RequestUtil
} from '@momentum/test-utils';

import * as assert from 'node:assert/strict';
// noinspection DuplicatedCode

import {
  ActivityDto,
  FollowDto,
  FollowStatusDto,
  MapDto,
  MapNotifyDto,
  MapSummaryDto,
  ProfileDto,
  UserDto
} from '../../backend/src/app/dto';

import {
  ActivityType,
  Ban,
  Gamemode,
  MapCreditType,
  ReportCategory,
  ReportType,
  Role,
  Socials,
  TrackType
} from '@momentum/constants';
import { PrismaClient, User } from '@momentum/db';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import { createHash } from 'node:crypto';

describe('User', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil, auth: AuthUtil;

  before(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    auth = env.auth;
  });

  after(async () => {
    await teardownE2ETestEnvironment(app, prisma);
  });

  describe('user', () => {
    describe('GET', () => {
      let user, token;
      before(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { profile: { create: { bio: randomString() } } },
          include: { profile: true }
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should respond with user data', async () => {
        const res = await req.get({
          url: 'user',
          status: 200,
          validate: UserDto,
          token
        });

        assert.equal(res.body.alias, user.alias);
        assert.ok(!Object.hasOwn(res.body, 'profile'));
      });

      it('should respond with user data and expand profile data', async () => {
        await req.expandTest({
          url: 'user',
          validate: UserDto,
          expand: 'profile',
          token
        });
      });

      it('should respond with user data and expand userStats data', async () => {
        await req.expandTest({
          url: 'user',
          validate: UserDto,
          expand: 'userStats',
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user', 'get');
      });
    });

    describe('PATCH', () => {
      after(async () => {
        await db.cleanup('user');
      });

      it("should update the authenticated user's alias", async () => {
        const [user, token] = await db.createAndLoginUser();
        const newAlias = 'Donkey Kong';

        await req.patch({
          url: 'user',
          status: 204,
          body: { alias: newAlias },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id },
          include: { profile: true }
        });

        assert.equal(updatedUser.alias, newAlias);
      });

      it("should fail to update the authenticated user's alias", async () => {
        const [user, token] = await db.createAndLoginUser();
        const newAlias = '    ';

        await req.patch({
          url: 'user',
          status: 400,
          body: { alias: newAlias },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id },
          include: { profile: true }
        });

        assert.notEqual(updatedUser.alias, newAlias);
      });

      it("should reset the authenticated user's alias to steam alias", async () => {
        const steamAlias = 'Bork';

        const steamSummarySpy = mock.method(
          app.get(SteamService),
          'getSteamUserSummaryData'
        );
        steamSummarySpy.mock.mockImplementation(() =>
          Promise.resolve({ personaname: steamAlias })
        );

        const [user, token] = await db.createAndLoginUser({
          data: { alias: 'Not Bork' }
        });

        await req.patch({
          url: 'user',
          status: 204,
          body: { alias: '' },
          token
        });

        steamSummarySpy.mock.restore();

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id }
        });

        assert.equal(updatedUser.alias, steamAlias);
      });

      it("should update the authenticated user's bio", async () => {
        const [user, token] = await db.createAndLoginUser();
        const newBio = 'I Love Donkey Kong';

        await req.patch({
          url: 'user',
          status: 204,
          body: { bio: newBio },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id },
          include: { profile: true }
        });

        assert.equal(updatedUser.profile.bio, newBio);
      });

      it("should update the authenticated user's socials", async () => {
        const [user, token] = await db.createAndLoginUser();
        const socialNames: Record<keyof Socials, string> = {
          Discord: 'wumpusfan123',
          Mastodon: '@user@domain.com',
          Twitter: 'istwiterdeadyet',
          YouTube: '@DSPGaming',
          Twitch: 'pogchamp123',
          'Ko-fi': 'givememoney',
          Paypal: '@givememoney',
          Patreon: 'givememoneyregularly',
          Github: 'TheLispGenius',
          Instagram: 'picture_of_food',
          Spotify: 'oinhusyaby7f98gt6s',
          LinkedIn: 'gamer-ceo-123'
        };

        await req.patch({
          url: 'user',
          status: 204,
          body: { socials: socialNames },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id },
          include: { profile: true }
        });

        const socials = updatedUser.profile.socials as Socials;

        assert.partialDeepStrictEqual(socials, socialNames);
      });

      it('should delete any social not on the update object', async () => {
        const [user, token] = await db.createAndLoginUser({
          data: {
            profile: {
              create: { socials: { YouTube: 'theminecraftplay2003' } }
            }
          }
        });

        await req.patch({
          url: 'user',
          status: 204,
          body: { socials: { LinkedIn: 'thegamerCEO2003' } },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id },
          include: { profile: true }
        });

        const socials = updatedUser.profile.socials as Socials;

        assert.equal(socials.YouTube, undefined);
      });

      it("should update the both authenticated user's bio and profile", async () => {
        const [user, token] = await db.createAndLoginUser();
        const newBio = 'I Love Donkey Kong';
        const discordUsername = 'discorduser123';

        await req.patch({
          url: 'user',
          status: 204,
          body: { bio: newBio, socials: { Discord: discordUsername } },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id },
          include: { profile: true }
        });

        const socials = updatedUser.profile.socials as Socials;
        assert.equal(socials.Discord, discordUsername);

        assert.equal(updatedUser.profile.bio, newBio);
      });

      it('should 400 for an invalid social', async () => {
        const token = await db.loginNewUser();

        await req.patch({
          url: 'user',
          status: 400,
          body: { socials: { rateyourmusic: 'acdcfan1965' } },
          token
        });
      });

      it('should 403 when trying to update bio when bio banned', async () => {
        const [_, token] = await db.createAndLoginUser({
          data: { bans: Ban.BIO }
        });

        await req.patch({
          url: 'user',
          status: 403,
          body: { bio: 'Gamer Words' },
          token
        });
      });

      it('should 403 when trying to update bio when alias banned', async () => {
        const [_, token] = await db.createAndLoginUser({
          data: { bans: Ban.ALIAS }
        });

        await req.patch({
          url: 'user',
          status: 403,
          body: { alias: 'Gamer Words' },
          token
        });
      });

      it('should 409 when a verified user tries to set their alias to something used by another verified user', async () => {
        const [u1] = await db.createAndLoginUser({
          data: { roles: Role.VERIFIED }
        });
        const [_, u2Token] = await db.createAndLoginUser({
          data: { roles: Role.VERIFIED }
        });

        await req.patch({
          url: 'user',
          status: 409,
          body: { alias: u1.alias },
          token: u2Token
        });
      });

      it('should allow a verified user to set their alias to something used by an unverified user', async () => {
        const [_, u1Token] = await db.createAndLoginUser({
          data: { roles: Role.VERIFIED }
        });
        const [u2] = await db.createAndLoginUser();

        await req.patch({
          url: 'user',
          status: 204,
          body: { alias: u2.alias },
          token: u1Token
        });
      });

      it('should allow an unverified user to set their alias to something used by a verified user', async () => {
        const [_, u1Token] = await db.createAndLoginUser({
          data: { roles: Role.VERIFIED }
        });
        const [u2] = await db.createAndLoginUser();

        await req.patch({
          url: 'user',
          status: 204,
          body: { alias: u2.alias },
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user', 'patch');
      });

      it("should update the authenticated user's country code", async () => {
        const [user, token] = await db.createAndLoginUser();
        const newCountryCode = 'TL';

        await req.patch({
          url: 'user',
          status: 204,
          body: { country: newCountryCode },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id },
          include: { profile: true }
        });

        assert.equal(updatedUser.country, newCountryCode);
      });

      it('should 400 since countryCode is not ISO Alpha-2 (verified by class-validator)', async () => {
        const [_, token] = await db.createAndLoginUser();
        const newCountryCode = 'NAN';

        await req.patch({
          url: 'user',
          status: 400,
          body: { countryCode: newCountryCode },
          token
        });
      });
    });

    describe('DELETE', () => {
      after(async () => {
        await db.cleanup(
          'leaderboardRun',
          'pastRun',
          'mMap',
          'report',
          'activity',
          'deletedUser'
        );
      });

      it('should delete user data, leaving user with Role.DELETED', async () => {
        const steamID = 12345;
        const steamIDHash = createHash('sha256')
          .update(steamID.toString())
          .digest('hex');

        const followeeUser = await db.createUser();
        const map = await db.createMap();
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

        const token = auth.login(user);
        await db.createPastRun({
          map,
          user,
          trackNum: 1,
          trackType: TrackType.MAIN,
          lbRank: 1,
          createLbRun: true,
          time: 1,
          gamemode: Gamemode.AHOP
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
            leaderboardRuns: true,
            pastRuns: true,
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
          url: 'user',
          status: 204,
          token
        });

        const deletedUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            profile: true,
            userStats: true,
            submittedMaps: true,
            mapCredits: true,
            mapFavorites: true,
            leaderboardRuns: true,
            pastRuns: true,
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
          alias: 'Deleted User',
          avatar: null,
          country: null,
          profile: { bio: '', socials: {} },
          userStats: userBeforeDeletion.userStats,
          submittedMaps: userBeforeDeletion.submittedMaps,
          mapCredits: userBeforeDeletion.mapCredits,
          mapFavorites: [],
          leaderboardRuns: userBeforeDeletion.leaderboardRuns,
          pastRuns: userBeforeDeletion.pastRuns,
          reviewsSubmitted: userBeforeDeletion.reviewsSubmitted,
          activities: [],
          follows: [],
          followers: [],
          mapNotifies: userBeforeDeletion.mapNotifies,
          notifications: [],
          reportSubmitted: userBeforeDeletion.reportSubmitted,
          reportResolved: userBeforeDeletion.reportResolved
        });

        assert.ok(deletedSteamIDEntry);
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user', 'del');
      });
    });
  });

  describe('user/profile', () => {
    describe('GET', () => {
      it("should respond with authenticated user's profile info", async () => {
        const [user, token] = await db.createAndLoginUser({
          data: { profile: { create: { bio: 'Hello' } } },
          include: { profile: true }
        });

        const res = await req.get({
          url: 'user/profile',
          status: 200,
          token,
          validate: ProfileDto
        });

        assert.equal(res.body.bio, (user as any).profile.bio);

        await prisma.user.deleteMany();
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/profile', 'get');
      });
    });
  });

  describe('user/follow', () => {
    describe('POST', () => {
      let u1, u1Token, u2, u3;

      before(async () => {
        await ([[u1, u1Token], u2, u3] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]));
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should follow multiple users', async () => {
        await req.post({
          url: 'user/follow',
          status: 201,
          body: { targetUserIDs: [u2.id, u3.id] },
          token: u1Token
        });

        const userFollows = await prisma.follow.findMany({
          where: { followeeID: u1.id }
        });

        assert.equal(userFollows.length, 2);
      });

      it('should 400 for invalid body', async () => {
        await req.post({
          url: 'user/follow',
          status: 400,
          body: '1,2,3,4,the,minecraft,movie' as any,
          token: u1Token
        });

        await req.post({
          url: 'user/follow',
          status: 400,
          body: 'TRUNCATE public."User"' as any,
          token: u1Token
        });
      });

      it('should 404 if any of the target users do not exist', async () => {
        await req.post({
          url: 'user/follow',
          status: 404,
          body: { targetUserIDs: [u2.id, NULL_ID] },
          token: u1Token
        });
      });
    });
  });

  describe('user/follow/{userID}', () => {
    describe('GET', () => {
      let u1, u1Token, u2;

      beforeEach(async () => {
        await ([[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]));
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should return relationships of the given and local user who follow each other', async () => {
        await prisma.follow.createMany({
          data: [
            { followeeID: u1.id, followedID: u2.id },
            { followeeID: u2.id, followedID: u1.id }
          ]
        });

        const res = await req.get({
          url: `user/follow/${u2.id}`,
          status: 200,
          token: u1Token,
          validate: FollowStatusDto
        });

        assert.partialDeepStrictEqual(res.body, {
          local: { followed: { id: u2.id }, followee: { id: u1.id } },
          target: { followed: { id: u1.id }, followee: { id: u2.id } }
        });
      });

      it('should return a relationship of the local user who follows the target, but not the opposite', async () => {
        await prisma.follow.create({
          data: { followeeID: u1.id, followedID: u2.id }
        });

        const res = await req.get({
          url: `user/follow/${u2.id}`,
          status: 200,
          token: u1Token,
          validate: FollowStatusDto
        });

        assert.partialDeepStrictEqual(res.body.local, {
          followed: { id: u2.id },
          followee: { id: u1.id }
        });
        assert.equal(res.body.target, null);
      });

      it('should return a relationship of the target user who follows the local user, but not the opposite', async () => {
        await prisma.follow.create({
          data: { followeeID: u2.id, followedID: u1.id }
        });

        const res = await req.get({
          url: `user/follow/${u2.id}`,
          status: 200,
          token: u1Token,
          validate: FollowStatusDto
        });

        assert.partialDeepStrictEqual(res.body.target, {
          followee: { id: u2.id },
          followed: { id: u1.id }
        });
        assert.equal(res.body.local, null);
      });

      it('should have neither sides of relationship if their neither relationship exists', async () => {
        const res = await req.get({
          url: `user/follow/${u2.id}`,
          status: 200,
          token: u1Token,
          validate: FollowStatusDto
        });

        assert.equal(res.body.local, null);
        assert.equal(res.body.target, null);
      });

      it('should 404 if the target user does not exist', async () => {
        await req.get({
          url: `user/follow/${NULL_ID}`,
          status: 404,
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/follow/1', 'get');
      });
    });

    describe('POST', () => {
      let u1, u1Token, u2;

      beforeEach(async () => {
        await ([[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]));
      });

      after(async () => {
        await db.cleanup('user');
      });

      it("should 204 and add user to authenticated user's follow list", async () => {
        const res = await req.post({
          url: `user/follow/${u2.id}`,
          status: 201,
          validate: FollowDto,
          token: u1Token
        });
        assert.partialDeepStrictEqual(res.body, {
          followedID: u2.id,
          followeeID: u1.id,
          notifyOn: 0
        });

        const follow = await prisma.follow.findFirst({
          where: { followeeID: u1.id }
        });

        assert.equal(follow.followedID, u2.id);
      });

      it('should 404 if the target user does not exist', async () => {
        await req.post({
          url: `user/follow/${NULL_ID}`,
          status: 404,
          token: u1Token
        });
      });

      it('should 400 if the authenticated user is already following the target user', async () => {
        await prisma.follow.create({
          data: { followeeID: u1.id, followedID: u2.id }
        });

        await req.post({
          url: `user/follow/${u2.id}`,
          status: 400,
          token: u1Token
        });
      });

      it('should 400 if the authenticated user is the target user', async () => {
        await req.post({
          url: `user/follow/${u1.id}`,
          status: 400,
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/follow/1', 'post');
      });
    });

    describe('PATCH', () => {
      let u1, u1Token, u2;

      before(async () => {
        u2 = await db.createUser();
        [u1, u1Token] = await db.createAndLoginUser({
          data: { follows: { create: { followedID: u2.id } } }
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should update the following status of the local user and the followed user', async () => {
        let follow = await prisma.follow.findFirst({
          where: { followeeID: u1.id }
        });
        assert.equal(follow.notifyOn, 0);

        await req.patch({
          url: `user/follow/${u2.id}`,
          status: 204,
          body: { notifyOn: ActivityType.REVIEW_MADE },
          token: u1Token
        });

        follow = await prisma.follow.findFirst({
          where: { followeeID: u1.id }
        });
        assert.equal(follow.notifyOn, ActivityType.REVIEW_MADE);
      });

      it('should 400 if the body is invalid', async () => {
        await req.patch({
          url: `user/follow/${u2.id}`,
          status: 400,
          body: { notifyOn: 'burger' },
          token: u1Token
        });
      });

      it('should 404 if the target user does not exist', async () => {
        await req.patch({
          url: `user/follow/${NULL_ID}`,
          status: 404,
          body: { notifyOn: ActivityType.REVIEW_MADE },
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/follow/1', 'patch');
      });
    });

    describe('DELETE', () => {
      let u1, u1Token, u2;

      before(async () => {
        await ([[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]));
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should remove the user from the local users follow list', async () => {
        await prisma.follow.create({
          data: { followedID: u2.id, followeeID: u1.id }
        });

        await req.del({
          url: `user/follow/${u2.id}`,
          status: 204,
          token: u1Token
        });

        const follow = await prisma.follow.findFirst({
          where: { followeeID: u1.id }
        });
        assert.equal(follow, null);

        await prisma.follow.deleteMany();
      });

      it('should 404 if the target user is not followed by the local user ', async () => {
        await req.del({
          url: `user/follow/${u2.id}`,
          status: 404,
          token: u1Token
        });
      });

      it('should 404 if the target user does not exist', async () => {
        await req.del({
          url: `user/follow/${NULL_ID}`,
          status: 404,
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/follow/1', 'del');
      });
    });
  });

  describe('user/notifyMap/{mapID}', () => {
    describe('GET ', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should return a MapNotify DTO for a given user and map', async () => {
        const activityType = ActivityType.WR_ACHIEVED;
        await prisma.mapNotify.create({
          data: { userID: user.id, mapID: map.id, notifyOn: activityType }
        });

        const res = await req.get({
          url: `user/notifyMap/${map.id}`,
          status: 200,
          token,
          validate: MapNotifyDto
        });

        assert.equal(res.body.notifyOn, activityType);

        await prisma.mapNotify.deleteMany();
      });

      it('should 404 if the user does not have mapnotify for given map', async () => {
        await req.get({
          url: `user/notifyMap/${map.id}`,
          status: 404,
          token
        });
      });

      it('should 404 if the target map does not exist', async () => {
        await req.get({
          url: `user/notifyMap/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/notifyMap/1', 'get');
      });
    });

    describe('PUT ', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should update map notification status with existing notifications', async () => {
        await prisma.mapNotify.create({
          data: {
            userID: user.id,
            mapID: map.id,
            notifyOn: ActivityType.WR_ACHIEVED
          }
        });

        const newActivityType = ActivityType.PB_ACHIEVED;
        await req.put({
          url: `user/notifyMap/${map.id}`,
          status: 204,
          body: { notifyOn: newActivityType },
          token
        });

        const mapNotify = await prisma.mapNotify.findFirst({
          where: { userID: user.id }
        });
        assert.equal(mapNotify.notifyOn, newActivityType);

        await prisma.mapNotify.deleteMany();
      });

      it('should create new map notification status if no existing notifications', async () => {
        const activityType = ActivityType.REVIEW_MADE;
        await req.put({
          url: `user/notifyMap/${map.id}`,
          status: 204,
          body: { notifyOn: activityType },
          token
        });

        const mapNotify = await prisma.mapNotify.findFirst({
          where: { userID: user.id }
        });
        assert.equal(mapNotify.notifyOn, activityType);

        await prisma.mapNotify.deleteMany();
      });

      it('should 400 is the body is invalid', async () => {
        await req.put({
          url: `user/notifyMap/${map.id}`,
          status: 400,
          body: { notifyOn: 'this is a sausage' },
          token
        });
      });

      it('should 404 if the target map does not exist', async () => {
        await req.put({
          url: `user/notifyMap/${NULL_ID}`,
          status: 404,
          body: { notifyOn: ActivityType.PB_ACHIEVED },
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/notifyMap/1', 'put');
      });
    });

    describe('DELETE', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should remove the user from map notifications list', async () => {
        await prisma.mapNotify.create({
          data: {
            userID: user.id,
            mapID: map.id,
            notifyOn: ActivityType.REVIEW_MADE
          }
        });

        await req.del({
          url: `user/notifyMap/${map.id}`,
          status: 204,
          token
        });

        const mapNotify = await prisma.mapNotify.findFirst({
          where: { userID: user.id }
        });
        assert.equal(mapNotify, null);
      });

      it('should 404 if the user is not following the map', async () => {
        await req.del({
          url: `user/notifyMap/${map.id}`,
          status: 404,
          token
        });
      });

      it('should 404 if the target map does not exist', async () => {
        await req.del({
          url: `user/notifyMap/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/notifyMap/1', 'del');
      });
    });
  });

  describe('user/activities', () => {
    describe('GET', () => {
      let user, token;

      before(async () => {
        [user, token] = await db.createAndLoginUser();
        await prisma.activity.createMany({
          data: [
            { userID: user.id, data: 1n, type: ActivityType.ALL },
            { userID: user.id, data: 2n, type: ActivityType.ALL },
            { userID: user.id, data: 2n, type: ActivityType.MAP_UPLOADED }
          ]
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should retrieve the local users activities', async () => {
        const res = await req.get({
          url: 'user/activities',
          status: 200,
          token,
          validatePaged: ActivityDto
        });

        for (const r of res.body.data) assert.equal(r.user.alias, user.alias);
        assert.equal(res.body.totalCount, 3);
        assert.equal(res.body.returnCount, 3);
      });

      it('should respond with a limited list of activities for the local user when using the take query param', async () => {
        await req.takeTest({
          url: 'user/activities',
          validate: ActivityDto,
          token
        });
      });

      it('should respond with a different list of activities for the local user when using the skip query param', async () => {
        await req.skipTest({
          url: 'user/activities',
          validate: ActivityDto,
          token
        });
      });

      it('should respond with a filtered list of activities for the local user when using the type query param', async () => {
        const res = await req.get({
          url: 'user/activities',
          status: 200,
          validatePaged: ActivityDto,
          query: { type: ActivityType.MAP_UPLOADED },
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 1,
          returnCount: 1,
          data: [{ type: ActivityType.MAP_UPLOADED }]
        });
      });

      it('should respond with a filtered list of activities for the local user when using the data query param', async () => {
        const res = await req.get({
          url: 'user/activities',
          status: 200,
          validatePaged: ActivityDto,
          query: { data: 2 },
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 2,
          returnCount: 2
        });
      });

      it('should respond with an empty list of activities for the local user when using the data query param with nonexistent data', async () => {
        const res = await req.get({
          url: 'user/activities',
          status: 200,
          query: { data: NULL_ID },
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 0,
          returnCount: 0
        });
        assert.ok(res.body.data instanceof Array);
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/activities', 'get');
      });
    });
  });

  describe('user/activities/followed', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u2Token;

      before(async () => {
        [[u1, u1Token], [u2, u2Token]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser()
        ]);
        await prisma.follow.create({
          data: { followeeID: u1.id, followedID: u2.id }
        });
        await prisma.activity.createMany({
          data: [
            {
              userID: u2.id,
              data: 1n,
              type: ActivityType.WR_ACHIEVED,
              createdAt: futureDateOffset(2)
            },
            {
              userID: u2.id,
              data: 2n,
              type: ActivityType.REVIEW_MADE,
              createdAt: futureDateOffset(1)
            }
          ]
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should retrieve a list of activities from the local users followed users', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          validatePaged: ActivityDto,
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 2,
          returnCount: 2,
          data: [{ user: { alias: u2.alias } }, { user: { alias: u2.alias } }]
        });
      });

      it('should order the list by descending date', async () => {
        await req.sortByDateTest({
          url: 'user/activities/followed',
          validate: ActivityDto,
          token: u1Token
        });
      });

      it('should respond with a limited list of activities for the u1 when using the take query param', async () => {
        await req.takeTest({
          url: 'user/activities/followed',
          validate: ActivityDto,
          token: u1Token
        });
      });

      it('should respond with a different list of activities for the u1 when using the skip query param', async () => {
        await req.skipTest({
          url: 'user/activities/followed',
          validate: ActivityDto,
          token: u1Token
        });
      });

      it('should respond with a filtered list of activities for the u1 when using the type query param', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          query: { type: ActivityType.WR_ACHIEVED },
          validatePaged: ActivityDto,
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 1,
          returnCount: 1,
          data: [{ userID: u2.id, type: ActivityType.WR_ACHIEVED, data: 1 }]
        });
      });

      it('should respond with a filtered list of activities for the u1 when using the data query param', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          query: { data: 2 },
          validatePaged: ActivityDto,
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 1,
          returnCount: 1,
          data: [{ userID: u2.id, data: 2, type: ActivityType.REVIEW_MADE }]
        });
      });

      it('should respond with an empty list of activities for the u1 when using the data query param with nonexistent data', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          query: { data: NULL_ID },
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 0,
          returnCount: 0
        });
        assert.ok(res.body.data instanceof Array);
      });

      it('should respond with an empty list of activities for a u1 that is not following anyone', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          token: u2Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 0,
          returnCount: 0
        });
        assert.ok(res.body.data instanceof Array);
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/activities/followed', 'get');
      });
    });
  });

  describe('user/maps/favorites/{mapID}', () => {
    describe('GET', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should return 204 if the map is not in favorites', async () => {
        await prisma.mapFavorite.create({
          data: { userID: user.id, mapID: map.id }
        });

        await req.get({
          url: `user/maps/favorites/${map.id}`,
          token,
          status: 204
        });

        await prisma.mapFavorite.deleteMany();
      });

      it('should return 410 if the map is not in favorites', async () => {
        await req.get({
          url: `user/maps/favorites/${map.id}`,
          token,
          status: 410
        });
      });

      it("should return 410 if the map doesn't exist", async () => {
        await req.get({
          url: `user/maps/favorites/${NULL_ID}`,
          token,
          status: 410
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps/favorites/1', 'get');
      });
    });

    describe('PUT', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should add a new map to the local users favorites', async () => {
        let stats = await prisma.mapStats.findUnique({
          where: { mapID: map.id }
        });

        assert.equal(stats.favorites, 0);

        await req.put({
          url: `user/maps/favorites/${map.id}`,
          status: 204,
          token
        });

        const favorite = await prisma.mapFavorite.findFirst({
          where: { userID: user.id }
        });
        assert.equal(favorite.mapID, map.id);

        stats = await prisma.mapStats.findUnique({
          where: { mapID: map.id }
        });

        assert.equal(stats.favorites, 1);
      });

      it("should 404 if the map doesn't exist", async () => {
        await req.put({
          url: `user/maps/favorites/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 400 if the map is already in users favorites', async () => {
        await req.put({
          url: `user/maps/favorites/${map.id}`,
          status: 400,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps/favorites/1', 'put');
      });
    });

    describe('DELETE', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should delete a map from the local users favorites', async () => {
        await prisma.mapFavorite.create({
          data: { userID: user.id, mapID: map.id }
        });

        await prisma.mapStats.update({
          where: { mapID: map.id },
          data: { favorites: 1 }
        });

        await req.del({
          url: `user/maps/favorites/${map.id}`,
          status: 204,
          token
        });

        const favorite = await prisma.mapFavorite.findFirst({
          where: { userID: user.id, mapID: map.id }
        });
        assert.equal(favorite, null);

        const stats = await prisma.mapStats.findUnique({
          where: { mapID: map.id }
        });

        assert.equal(stats.favorites, 0);
      });

      it('should 400 if the map is not in the local users favorites', async () => {
        await req.del({
          url: `user/maps/favorites/${map.id}`,
          status: 400,
          token
        });
      });

      it('should 404 if the map is not in the database', async () => {
        await req.del({
          url: `user/maps/favorites/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps/favorites/1', 'del');
      });
    });
  });

  describe('user/maps', () => {
    describe('GET', () => {
      let u1: User, u1Token: string, u2Token: string;

      before(async () => {
        [[u1, u1Token], u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser()
        ]);
        await Promise.all([
          db.createMap({
            name: 'ahop_aaaaaaaa',
            submitter: { connect: { id: u1.id } },
            credits: {
              create: {
                userID: u1.id,
                type: MapCreditType.TESTER
              }
            }
          }),
          db.createMap({
            name: 'ahop_bbbbbbbb',
            submitter: { connect: { id: u1.id } }
          })
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should retrieve the list of maps that the user submitted', async () => {
        await req.get({
          url: 'user/maps',
          status: 200,
          token: u1Token,
          validatePaged: { type: MapDto, count: 2 }
        });
      });

      it('should retrieve an empty map list if the user has not submitted any maps', async () => {
        const res = await req.get({
          url: 'user/maps',
          status: 200,
          token: u2Token
        });

        assert.partialDeepStrictEqual(res.body, {
          returnCount: 0,
          totalCount: 0
        });
      });

      it('should retrieve the users submitted maps when using the skip query parameter', async () => {
        await req.skipTest({
          url: 'user/maps',
          validate: MapDto,
          token: u1Token
        });
      });

      it('should retrieve the users submitted maps when using the take query parameter', async () => {
        await req.takeTest({
          url: 'user/maps',
          validate: MapDto,
          token: u1Token
        });
      });

      it('should retrieve the submitted maps with expanded info', async () => {
        await req.expandTest({
          url: 'user/maps',
          validate: MapDto,
          paged: true,
          expand: 'info',
          token: u1Token
        });
      });

      it('should retrieve the submitted maps with expanded submitter', async () => {
        await req.expandTest({
          url: 'user/maps',
          validate: MapDto,
          paged: true,
          expand: 'submitter',
          token: u1Token
        });
      });

      it('should retrieve the submitted maps with expanded credits', async () => {
        await req.expandTest({
          url: 'user/maps',
          validate: MapDto,
          paged: true,
          expand: 'credits',
          token: u1Token,
          some: true
        });
      });

      it('should retrieve a map specified by a search query parameter', async () => {
        await req.searchTest({
          url: 'user/maps',
          token: u1Token,
          validate: { type: MapDto, count: 1 },
          searchPropertyName: 'name',
          searchMethod: 'contains',
          searchString: 'bbb'
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps', 'get');
      });
    });
  });

  describe('user/maps/summary', () => {
    describe('GET', () => {
      let u1, u1Token, u2Token;

      before(async () => {
        [[u1, u1Token], u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser()
        ]);
        await Promise.all([
          db.createMap({
            name: 'ahop_aaaaaaaa',
            submitter: { connect: { id: u1.id } }
          }),
          db.createMap({
            name: 'ahop_bbbbbbbb',
            submitter: { connect: { id: u1.id } }
          })
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should retrieve an array of objects that each contain a status and its count', async () => {
        const res = await req.get({
          url: 'user/maps/summary',
          status: 200,
          token: u1Token
        });

        assert.ok(res.body instanceof Array);
        for (const item of res.body) assertValidDto(item, MapSummaryDto);
      });

      it('should retrieve an empty summary list', async () => {
        const res = await req.get({
          url: 'user/maps/summary',
          status: 200,
          token: u2Token
        });

        assert.ok(res.body instanceof Array);
        assert.equal(res.body.length, 0);
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps/summary', 'get');
      });
    });
  });
});
