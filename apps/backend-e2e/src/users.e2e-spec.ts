// noinspection DuplicatedCode

import {
  ActivityDto,
  FollowDto,
  MapCreditDto,
  ProfileDto,
  UserDto
} from '@momentum/backend/dto';
import {
  AuthUtil,
  futureDateOffset,
  DbUtil,
  NULL_ID,
  RequestUtil
} from '@momentum/backend/test-utils';
import { ActivityType, MapCreditType } from '@momentum/constants';
import { PrismaClient } from '@prisma/client';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

describe('Users', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil, auth: AuthUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    auth = env.auth;
  });

  afterAll(() => teardownE2ETestEnvironment(app));

  describe('users/', () => {
    describe('GET', () => {
      let users, token;

      beforeAll(async () => {
        users = await db.createUsers(3);
        token = auth.login(users[0]);
      });

      afterAll(() => db.cleanup('user', 'mMap', 'run'));

      it('should respond with paged list of users', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          validatePaged: { type: UserDto, count: 3 },
          token: token
        });

        // Quick check we're not sending back stuff that wasn't included.
        // Not doing these for all tests, once or twice can't hurt.
        for (const user of res.body.data)
          expect(user).not.toHaveProperty('profile');
      });

      it('should respond with a paged list of users with take parameter', () =>
        req.takeTest({ url: 'users', validate: UserDto, token: token }));

      it('should respond with a paged list of users with skip parameter', async () =>
        req.skipTest({ url: 'users', validate: UserDto, token: token }));

      it('should respond with a paged list of users with search by alias parameter', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { search: users[0].alias },
          validatePaged: { type: UserDto, count: 1 },
          token: token
        });

        expect(res.body.data[0].id).toBe(users[0].id);
      });

      it('should respond with a paged list of users containing a case-insensitive match on an alias', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { search: users[0].alias.toUpperCase() },
          validatePaged: { type: UserDto, count: 1 },
          token: token
        });

        expect(res.body.data[0].id).toBe(users[0].id);
      });

      it('should respond with an empty a paged list of users using a search by parameter containing a nonexistent alias', () =>
        req.get({
          url: 'users',
          status: 200,
          query: { search: 'Abstract Barry' },
          validatePaged: { type: UserDto, count: 0 },
          token: token
        }));

      it('should respond with a paged list of users with expanded profiles when using an expand parameter', () =>
        req.expandTest({
          url: 'users',
          expand: 'profile',
          validate: UserDto,
          paged: true,
          token: token
        }));

      it('should respond with a paged list of users with expanded stats when using an expand parameter', () =>
        req.expandTest({
          url: 'users',
          expand: 'userStats',
          validate: UserDto,
          paged: true,
          token: token
        }));

      it('should respond with an array of one user for a matching SteamID parameter', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { steamID: users[0].steamID },
          validatePaged: { type: UserDto, count: 1 },
          token: token
        });

        expect(res.body.data[0].id).toBe(users[0].id);
      });

      it('should respond with an empty array for a nonexistent SteamID parameter', () =>
        req.get({
          url: 'users',
          status: 200,
          query: { steamID: 3141592612921 },
          validatePaged: { type: UserDto, count: 0 },
          token: token
        }));

      it('should respond with an array of multiple users for multiple matching SteamID parameters', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { steamIDs: users[0].steamID + ',' + users[1].steamID },
          validatePaged: { type: UserDto, count: 2 },
          token: token
        });

        for (const user of res.body.data)
          expect([users[0].steamID, users[1].steamID]).toContain(
            BigInt(user.steamID)
          );
      });

      it('should respond with should respond with an empty array for multiple nonexistent SteamID parameters', () =>
        req.get({
          url: 'users',
          status: 200,
          query: { steamIDs: 1111111111111111 + ',' + 2222222222222222 },
          validatePaged: { type: UserDto, count: 0 },
          token: token
        }));

      it('should respond with the specified user with with a corresponding map rank and run when given a mapRank mapid', async () => {
        const map = await db.createMap();
        const run = await db.createRunAndRankForMap({
          map: map,
          user: users[0],
          rank: 1,
          ticks: 1
        });

        const res = await req.get({
          url: 'users',
          status: 200,
          query: { mapRank: map.id, steamID: users[0].steamID },
          token: token
        });

        expect(res.body.data[0].mapRank).toMatchObject({
          mapID: map.id,
          userID: users[0].id,
          runID: Number(run.id),
          rank: 1
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('users', 'get'));
    });
  });

  describe('users/{userID}', () => {
    describe('GET', () => {
      let user, token;

      beforeAll(
        async () =>
          ([user, token] = await db.createAndLoginUser({
            data: {
              alias: 'Arthur Weasley',
              avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240'
            }
          }))
      );

      afterAll(() => db.cleanup('user', 'mMap', 'run'));

      it('should respond with the specified user', async () => {
        const res = await req.get({
          url: `users/${user.id}`,
          status: 200,
          validate: UserDto,
          token: token
        });

        expect(res.body.alias).toBe('Arthur Weasley');
      });

      it('should respond with the specified user with a valid avatarURL', async () => {
        const res = await req.get({
          url: `users/${user.id}`,
          status: 200,
          validate: UserDto,
          token: token
        });

        expect(res.body.avatarURL).toBe(
          'https://avatars.cloudflare.steamstatic.com/ac7305567f93a4c9eec4d857df993191c61fb240_full.jpg'
        );
      });

      it('should respond with the specified user with expanded profile when using an expand parameter', () =>
        req.expandTest({
          url: `users/${user.id}`,
          validate: UserDto,
          expand: 'profile',
          token: token
        }));

      it('should respond with the specified user with with a corresponding map rank and run when given a mapRank mapid', async () => {
        const map = await db.createMap();
        const run = await db.createRunAndRankForMap({
          map: map,
          user: user,
          rank: 1,
          ticks: 1
        });

        const res = await req.get({
          url: `users/${user.id}`,
          status: 200,
          query: { mapRank: map.id },
          validate: UserDto,
          token: token
        });

        expect(res.body.mapRank).toMatchObject({
          mapID: map.id,
          userID: user.id,
          runID: Number(run.id),
          rank: 1
        });
      });

      it('should 404 if the user is not found', () =>
        req.get({ url: `users/${NULL_ID}`, status: 404, token: token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('users/1', 'get'));
    });
  });

  describe('GET /api/users/{userID}/profile', () => {
    let user, token;

    beforeAll(
      async () =>
        ([user, token] = await db.createAndLoginUser({
          data: { profile: { create: { bio: 'Sausages' } } }
        }))
    );

    afterAll(() => db.cleanup('user'));

    it('should respond with the specified users profile info', async () => {
      const res = await req.get({
        url: `users/${user.id}/profile`,
        status: 200,
        validate: ProfileDto,
        token: token
      });

      expect(res.body.bio).toBe('Sausages');
    });

    it('should 404 if the profile is not found', () =>
      req.get({ url: `users/${NULL_ID}/profile`, status: 404, token: token }));

    it('should 401 when no access token is provided', () =>
      req.unauthorizedTest('users/1/profile', 'get'));
  });

  describe('GET /api/users/{userID}/activities', () => {
    let user, token;

    beforeAll(async () => {
      [user, token] = await db.createAndLoginUser();
      await prisma.activity.createMany({
        data: [
          {
            data: 1n,
            type: ActivityType.ALL,
            userID: user.id,
            createdAt: futureDateOffset(1)
          },
          {
            data: 2n,
            type: ActivityType.ALL,
            userID: user.id,
            createdAt: futureDateOffset(0)
          },
          {
            data: 2n,
            type: ActivityType.MAP_UPLOADED,
            userID: user.id,
            createdAt: futureDateOffset(2)
          }
        ]
      });
    });

    afterAll(() => db.cleanup('user'));

    it('should respond with a list of activities related to the specified user', () =>
      req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        validatePaged: { type: ActivityDto, count: 3 },
        token: token
      }));

    it('should order the list by descending date', () =>
      req.sortByDateTest({
        url: `users/${user.id}/activities`,
        validate: ActivityDto,
        token
      }));

    it('should respond with a limited list of activities for the user when using the take query param', () =>
      req.takeTest({
        url: `users/${user.id}/activities`,
        validate: ActivityDto,
        token: token
      }));

    it('should respond with a different list of activities for the user when using the skip query param', () =>
      req.skipTest({
        url: `users/${user.id}/activities`,
        validate: ActivityDto,
        token: token
      }));

    it('should respond with a filtered list of activities for the user when using the type query param', async () => {
      const res = await req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        query: { type: ActivityType.MAP_UPLOADED },
        validatePaged: { type: ActivityDto, count: 1 },
        token: token
      });

      expect(res.body.data[0].type).toBe(ActivityType.MAP_UPLOADED);
    });

    it('should respond with a filtered list of activities for the user when using the data query param', () =>
      req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        query: { data: 2n },
        validatePaged: { type: ActivityDto, count: 2 },
        token: token
      }));

    it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', () =>
      req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        query: { data: NULL_ID },
        validatePaged: { type: ActivityDto, count: 0 },
        token: token
      }));

    it('should not include REPORT_FILED activities', async () => {
      await prisma.activity.create({
        data: { type: ActivityType.REPORT_FILED, data: 119n, userID: user.id }
      });

      const res = await req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        validatePaged: { type: ActivityDto, count: 3 },
        token: token
      });

      for (const act of res.body.data)
        expect(act.type).not.toBe(ActivityType.REPORT_FILED);
    });

    it('should 401 when no access token is provided', () =>
      req.unauthorizedTest('users/1/activities', 'get'));
  });

  describe('users/{userID}/follows', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u3;

      beforeAll(async () => {
        [[u1, u1Token], u2, u3] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]);
        await prisma.follow.createMany({
          data: [
            { followeeID: u1.id, followedID: u2.id },
            { followeeID: u1.id, followedID: u3.id },
            { followeeID: u3.id, followedID: u2.id }
          ]
        });
      });

      afterAll(() => db.cleanup('user'));

      it('should respond with a list of users the specified user follows', async () => {
        const res = await req.get({
          url: `users/${u1.id}/follows`,
          status: 200,
          validatePaged: { type: FollowDto, count: 2 },
          token: u1Token
        });

        // Follow users always include profiles
        for (const follow of res.body.data) {
          expect(follow.followee).toHaveProperty('profile');
          expect(follow.followed).toHaveProperty('profile');
        }
      });

      it('should respond with a limited list of follows for the user when using the take query param', () =>
        req.takeTest({
          url: `users/${u1.id}/follows`,
          validate: FollowDto,
          token: u1Token
        }));

      it('should respond with a different list of follows for the user when using the skip query param', () =>
        req.skipTest({
          url: `users/${u1.id}/follows`,
          validate: FollowDto,
          token: u1Token
        }));

      it('should return an empty list for a user who isnt following anyone', () =>
        req.get({
          url: `users/${u2.id}/follows`,
          status: 200,
          validatePaged: { type: FollowDto, count: 0 },
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('users/1/follows', 'get'));
    });
  });

  describe('users/{userID}/followers', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u3;

      beforeAll(async () => {
        [[u1, u1Token], u2, u3] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]);
        await prisma.follow.createMany({
          data: [
            { followeeID: u1.id, followedID: u2.id },
            { followeeID: u1.id, followedID: u3.id },
            { followeeID: u3.id, followedID: u2.id }
          ]
        });
      });

      afterAll(() => db.cleanup('user'));

      // These are just above, in reverse
      it('should respond with a list of users that follow the specified user', async () => {
        const res = await req.get({
          url: `users/${u2.id}/followers`,
          status: 200,
          validatePaged: { type: FollowDto, count: 2 },
          token: u1Token
        });

        for (const follow of res.body.data) {
          expect(follow.followee).toHaveProperty('profile');
          expect(follow.followed).toHaveProperty('profile');
        }
      });

      it('should respond with a limited list of followers for the user when using the take query param', () =>
        req.takeTest({
          url: `users/${u2.id}/followers`,
          validate: FollowDto,
          token: u1Token
        }));

      it('should respond with a different list of followers for the user when using the skip query param', () =>
        req.skipTest({
          url: `users/${u2.id}/followers`,
          validate: FollowDto,
          token: u1Token
        }));

      it('should return an empty list for a user who isnt following anyone', () =>
        req.get({
          url: `users/${u2.id}/follows`,
          status: 200,
          validatePaged: { type: FollowDto, count: 0 },
          token: u1Token
        }));

      it('should return an empty list for a user who isnt followed by anyone', () =>
        req.get({
          url: `users/${u1.id}/followers`,
          status: 200,
          validatePaged: { type: FollowDto, count: 0 },
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('users/1/followers', 'get'));
    });
  });

  describe('users/{userID}/credits', () => {
    describe('GET', () => {
      let user, token;

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser();
        await db.createMaps(2, {
          credits: { create: { type: MapCreditType.AUTHOR, userID: user.id } }
        });
      });

      afterAll(() => db.cleanup('user', 'mMap'));

      it('should respond with a list of map credits for a specific user', () => {
        req.get({
          url: `users/${user.id}/credits`,
          status: 200,
          validatePaged: { type: MapCreditDto, count: 2 },
          token: token
        });
      });

      it('should respond with limited list of credits with take parameter', () =>
        req.takeTest({
          url: `users/${user.id}/credits`,
          validate: MapCreditDto,
          token: token
        }));

      it('should respond with different list of credits with skip parameter', () =>
        req.skipTest({
          url: `users/${user.id}/credits`,
          validate: MapCreditDto,
          token: token
        }));

      it('should respond with list of credits with map expand', () =>
        req.expandTest({
          url: `users/${user.id}/credits`,
          expand: 'map',
          validate: MapCreditDto,
          paged: true,
          token: token
        }));

      it('should respond with list of credits with info expand', () =>
        req.expandTest({
          url: `users/${user.id}/credits`,
          expand: 'info',
          expectedPropertyName: 'map.info',
          validate: MapCreditDto,
          paged: true,
          token: token
        }));

      it('should respond with list of credits with thumbnail expand', () =>
        req.expandTest({
          url: `users/${user.id}/credits`,
          expand: 'thumbnail',
          expectedPropertyName: 'map.thumbnail',
          validate: MapCreditDto,
          paged: true,
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('users/1/credits', 'get'));
    });
  });
});
