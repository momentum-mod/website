import { after, before, describe, it } from 'node:test';
import { randomString } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { UserDto } from '../../backend/src/app/dto';
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
import { createHash } from 'node:crypto';
import {
  app,
  prisma,
  req,
  db,
  auth,
  registerE2ETestFile
} from './support/e2e-environment';

describe('User', () => {
  registerE2ETestFile();

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

      it("should update the authenticated user's custom alias", async () => {
        const [user, token] = await db.createAndLoginUser({
          data: { realAlias: 'Steam Name' }
        });
        const newAlias = 'Donkey Kong';

        await req.patch({
          url: 'user',
          status: 204,
          body: { alias: newAlias },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id }
        });

        assert.partialDeepStrictEqual(updatedUser, {
          customAlias: newAlias,
          realAlias: 'Steam Name',
          alias: newAlias
        });
      });

      it('should respond with the custom alias as alias, without exposing customAlias or realAlias', async () => {
        const [_, token] = await db.createAndLoginUser({
          data: { realAlias: 'Steam Name', customAlias: 'Custom Name' }
        });

        const res = await req.get({
          url: 'user',
          status: 200,
          validate: UserDto,
          token
        });

        assert.equal(res.body.alias, 'Custom Name');
        assert.ok(!Object.hasOwn(res.body, 'customAlias'));
        assert.ok(!Object.hasOwn(res.body, 'realAlias'));
      });

      it('should respond with the real alias as alias when no custom alias is set', async () => {
        const [_, token] = await db.createAndLoginUser({
          data: { realAlias: 'Steam Name' }
        });

        const res = await req.get({
          url: 'user',
          status: 200,
          validate: UserDto,
          token
        });

        assert.equal(res.body.alias, 'Steam Name');
      });

      it("should fail to update the authenticated user's custom alias to whitespace", async () => {
        const [user, token] = await db.createAndLoginUser();
        const newAlias = '    ';

        await req.patch({
          url: 'user',
          status: 400,
          body: { alias: newAlias },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id }
        });

        assert.equal(updatedUser.customAlias, null);
        assert.notEqual(updatedUser.alias, newAlias);
      });

      it('should 400 when trying to update alias directly', async () => {
        const [user, token] = await db.createAndLoginUser();

        await req.patch({
          url: 'user',
          status: 400,
          body: { alias: 'Donkey Kong' },
          token
        });

        const updatedUser = await prisma.user.findFirst({
          where: { id: user.id }
        });

        assert.equal(updatedUser.alias, user.alias);
      });

      for (const reset of [null, '']) {
        it(`should reset the authenticated user's alias to steam alias when customAlias is ${JSON.stringify(reset)}`, async () => {
          const [user, token] = await db.createAndLoginUser({
            data: { realAlias: 'Bork', customAlias: 'Not Bork' }
          });

          await req.patch({
            url: 'user',
            status: 204,
            body: { customAlias: reset },
            token
          });

          const updatedUser = await prisma.user.findFirst({
            where: { id: user.id }
          });

          assert.partialDeepStrictEqual(updatedUser, {
            customAlias: null,
            realAlias: 'Bork',
            alias: 'Bork'
          });
        });
      }

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
          body: { customAlias: u1.alias },
          token: u2Token
        });
      });

      it("should only reserve a verified user's displayed alias, not their Steam alias", async () => {
        const [u1] = await db.createAndLoginUser({
          data: {
            roles: Role.VERIFIED,
            realAlias: 'Original Steam Name',
            customAlias: 'Custom Name'
          }
        });
        const [_, u2Token] = await db.createAndLoginUser({
          data: { roles: Role.VERIFIED }
        });

        // Only the effective alias is reserved, so this is fine
        await req.patch({
          url: 'user',
          status: 204,
          body: { customAlias: u1.realAlias },
          token: u2Token
        });

        await req.patch({
          url: 'user',
          status: 409,
          body: { customAlias: u1.customAlias },
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
          customAlias: null,
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
});
