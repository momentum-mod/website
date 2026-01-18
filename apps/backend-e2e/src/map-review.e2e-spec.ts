// noinspection DuplicatedCode

import { MapReviewCommentDto, MapReviewDto } from '../../backend/src/app/dto';

import {
  MapReview,
  MMap,
  Notification,
  PrismaClient,
  User
} from '@momentum/db';
import {
  DbUtil,
  FileStoreUtil,
  NULL_ID,
  RequestUtil,
  resetKillswitches
} from '@momentum/test-utils';
import {
  Gamemode,
  mapReviewAssetPath,
  MapStatus,
  NotificationType,
  MapSubmissionType,
  Role,
  TrackType
} from '@momentum/constants';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

describe('Map Reviews', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fileStore: FileStoreUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    fileStore = env.fileStore;
  });

  afterAll(() => teardownE2ETestEnvironment(app, prisma));

  describe('map-review/{reviewID}', () => {
    describe('GET', () => {
      let user, token, map, review;
      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.REVIEWER }
        });

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });

        review = await prisma.mapReview.create({
          data: {
            mainText:
              'Sync speedshot into sync speedshot, what substance did you take mapper?!?!',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.RJ,
                tier: 2,
                comment: 'True',
                gameplayRating: 1
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: user.id } },
            resolved: false
          }
        });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      it('should return the requested review', async () => {
        const response = await req.get({
          url: `map-review/${review.id}`,
          status: 200,
          validate: MapReviewDto,
          token: token
        });
        expect(response.body).toMatchObject({
          mainText: review.mainText,
          mapID: map.id,
          id: review.id
        });
      });

      it('should return the requested review including author information', async () => {
        await req.expandTest({
          url: `map-review/${review.id}`,
          token: token,
          expand: 'reviewer',
          validate: MapReviewDto
        });
      });

      it('should return the requested review including map information', async () => {
        await req.expandTest({
          url: `map-review/${review.id}`,
          token: token,
          expand: 'map',
          validate: MapReviewDto
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `map-review/${review.id}`,
          status: 403,
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return 404 for a nonexistent review', () =>
        req.get({
          url: `map-review/${NULL_ID}`,
          status: 404,
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('map-review/1', 'get'));
    });

    describe('PATCH', () => {
      let u1, u1Token, u2, u2Token, map, review1, review2;

      beforeAll(async () => {
        [[u1, u1Token], [u2, u2Token]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser({ data: { roles: Role.REVIEWER } })
        ]);
      });

      afterAll(() => db.cleanup('user'));

      beforeEach(async () => {
        map = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          reviewStats: {
            create: {
              total: 2,
              unresolved: 2,
              resolved: 0,
              approvals: 0
            }
          }
        });

        review1 = await prisma.mapReview.create({
          data: {
            mainText: 'delete this stage or i will have you killed',
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
            resolved: false,
            approves: false
          }
        });

        review2 = await prisma.mapReview.create({
          data: {
            mainText: 'what is this!!!!',
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u2.id } },
            resolved: false,
            approves: false
          }
        });
      });

      afterEach(() => db.cleanup('mMap'));

      it('should successfully update a review', async () => {
        const res = await req.patch({
          url: `map-review/${review2.id}`,
          status: 200,
          body: {
            mainText: 'actually i like this stage',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.AHOP,
                tier: 1,
                gameplayRating: 10
              }
            ],
            approves: true
          },
          validate: MapReviewDto,
          token: u2Token
        });

        expect(res.body.mainText).toBe('actually i like this stage');
        expect(res.body.approves).toBe(true);
      });

      it('should 400 for bad update data', () =>
        req.patch({
          url: `map-review/${review1.id}`,
          status: 400,
          body: {
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 2,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                gameplayRating: 10
              }
            ]
          },
          token: u1Token
        }));

      it('should 403 if not the reviewer', () =>
        req.patch({
          url: `map-review/${review1.id}`,
          status: 403,
          body: { mainText: 'i dont like this review' },
          token: u2Token
        }));

      it('should allow official reviewer to resolve their review', () =>
        req.patch({
          url: `map-review/${review2.id}`,
          status: 200,
          body: { resolved: true },
          token: u2Token
        }));

      it('should allow unofficial reviewer to resolve their review', () =>
        req.patch({
          url: `map-review/${review1.id}`,
          status: 200,
          body: { resolved: true },
          token: u1Token
        }));

      it('should allow official reviewer to mark their review as approves', () =>
        req.patch({
          url: `map-review/${review2.id}`,
          status: 200,
          body: { approves: true },
          token: u2Token
        }));

      it('should not allow unofficial reviewer mark their review as approved', () =>
        req.patch({
          url: `map-review/${review1.id}`,
          status: 403,
          body: { approves: true },
          token: u1Token
        }));

      it('should update review stats', async () => {
        const before = await prisma.mapReviewStats.findUnique({
          where: { mapID: map.id }
        });
        expect(before).toMatchObject({
          total: 2,
          approvals: 0,
          resolved: 0,
          unresolved: 2
        });

        await req.patch({
          url: `map-review/${review2.id}`,
          status: 200,
          body: { approves: true, resolved: true },
          token: u2Token
        });

        const after = await prisma.mapReviewStats.findUnique({
          where: { mapID: map.id }
        });
        expect(after).toMatchObject({
          total: 2,
          approvals: 1,
          resolved: 1,
          unresolved: 1
        });
      });

      it('should return 404 for missing review', () =>
        req.patch({
          url: `map-review/${NULL_ID}`,
          status: 404,
          body: { mainText: 'what' },
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('map-review/1', 'patch'));
    });

    describe('DELETE', () => {
      let user: User,
        token: string,
        u2Token: string,
        modToken: string,
        map: MMap,
        review: MapReview,
        _notif: Notification;
      const assetPath = mapReviewAssetPath('1');

      beforeAll(async () => {
        [[user, token], u2Token, modToken] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser({ data: { roles: Role.REVIEWER } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } })
        ]);
      });

      afterAll(() => db.cleanup('user'));

      beforeEach(async () => {
        map = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          submission: { create: { type: MapSubmissionType.ORIGINAL } },
          reviewStats: {
            create: { total: 1, unresolved: 0, resolved: 1, approvals: 1 }
          }
        });

        review = await prisma.mapReview.create({
          data: {
            mainText: 'This map was E Z',
            imageIDs: ['1'],
            suggestions: [
              {
                track: 1,
                gamemode: Gamemode.SURF,
                tier: 1,
                comment: 'I surfed this backwards',
                gameplayRating: 10
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: user.id } },
            resolved: true,
            approves: true
          }
        });

        _notif = await prisma.notification.create({
          data: {
            type: NotificationType.MAP_REVIEW_POSTED,
            notifiedUserID: map.submitterID,
            userID: review.reviewerID,
            mapID: map.id,
            reviewID: review.id
          }
        });

        await fileStore.add(assetPath, Buffer.alloc(1024));
      });

      afterEach(async () => {
        await fileStore.delete(assetPath);
        await db.cleanup('mMap', 'notification');
      });

      it('should allow a user to delete their own review', () =>
        req.del({
          url: `map-review/${review.id}`,
          status: 204,
          token: token
        }));

      it('should 503 if the killswitch is true', async () => {
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

        await req.del({
          url: `map-review/${review.id}`,
          status: 503,
          token: token
        });

        await resetKillswitches(req, adminToken);
      });

      it("should not allow another user to delete someone else's review", () =>
        req.del({
          url: `map-review/${review.id}`,
          status: 403,
          token: u2Token
        }));

      // needs to use admin endpoint
      it('should not allow a mod to delete a review', () =>
        req.del({
          url: `map-review/${review.id}`,
          status: 403,
          token: modToken
        }));

      it('should delete any stored assets', async () => {
        expect(await fileStore.exists(assetPath)).toBe(true);

        await req.del({
          url: `map-review/${review.id}`,
          status: 204,
          token: token
        });

        expect(await fileStore.exists(assetPath)).toBe(false);
      });

      it('should update stats', async () => {
        const before = await prisma.mapReviewStats.findUnique({
          where: { mapID: map.id }
        });
        expect(before).toMatchObject({
          total: 1,
          approvals: 1,
          resolved: 1,
          unresolved: 0
        });

        await req.del({
          url: `map-review/${review.id}`,
          status: 204,
          token
        });

        const after = await prisma.mapReviewStats.findUnique({
          where: { mapID: map.id }
        });
        expect(after).toMatchObject({
          total: 0,
          approvals: 0,
          resolved: 0,
          unresolved: 0
        });
      });

      it('should delete relevant notifications', async () => {
        await req.del({
          url: `map-review/${review.id}`,
          status: 204,
          token: token
        });
        const notifs = await prisma.notification.findMany();
        expect(notifs).toHaveLength(0);
      });

      it('should return 404 for trying to delete a nonexistent review for a map', () =>
        req.del({
          url: `map-review/${NULL_ID}`,
          status: 404,
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('map-review/1', 'del'));
    });
  });

  describe('map-review/{reviewID}/comments', () => {
    describe('GET', () => {
      let user: User, token: string, map: MMap, reviewID: number;

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser();

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });

        const review = await prisma.mapReview.create({
          data: {
            mainText: 'DISGUSTING',
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: user.id } },
            resolved: false
          }
        });
        reviewID = review.id;

        await prisma.mapReviewComment.createMany({
          data: [
            { reviewID, userID: user.id, text: 'no it isnt!!' },
            { reviewID, userID: user.id, text: 'we are the same person' },
            { reviewID, userID: user.id, text: 'oh' }
          ]
        });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      it('should fetch a paginated list of comments', async () => {
        const res = await req.get({
          url: `map-review/${reviewID}/comments`,
          status: 200,
          validatePaged: { type: MapReviewCommentDto, count: 3 },
          token
        });

        expect(res.body.data[0]).toHaveProperty('user');
      });
    });

    describe('POST', () => {
      let user1: User,
        u1Token: string,
        user2: User,
        u2Token: string,
        admin: User,
        adminToken: string,
        map: MMap,
        reviewID: number;

      beforeAll(async () => {
        [[user1, u1Token], [user2, u2Token], [admin, adminToken]] =
          await Promise.all([
            db.createAndLoginUser(),
            db.createAndLoginUser(),
            db.createAndLoginUser({ data: { roles: Role.ADMIN } })
          ]);

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });

        const review = await prisma.mapReview.create({
          data: {
            mainText: 'DISGUSTING',
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: user1.id } },
            resolved: false
          }
        });
        reviewID = review.id;

        await prisma.mapReviewComment.createMany({
          data: [
            { reviewID, userID: user1.id, text: 'no it isnt!!' },
            { reviewID, userID: user1.id, text: 'we are the same person' },
            { reviewID, userID: user1.id, text: 'oh' },
            { reviewID, userID: user2.id, text: 'you are a fool' },
            { reviewID, userID: admin.id, text: 'be nice D:' }
          ]
        });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      it('should 400 if commenting on non-existing review', () =>
        req.post({
          url: `map-review/${NULL_ID}/comments`,
          status: 400,
          body: {
            data: {
              text: 'Not disgusting!!'
            }
          },
          token: u1Token
        }));

      it('should 503 if the killswitch is true', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_REVIEWS: true
          },
          token: adminToken
        });

        await req.post({
          url: `map-review/${map.id}/comments`,
          status: 503,
          body: {
            data: {
              text: 'something'
            }
          },
          token: u1Token
        });

        await resetKillswitches(req, adminToken);
      });

      it('should send a notification to the reviewer and map submitter on created comment', async () => {
        await req.post({
          url: `map-review/${reviewID}/comments`,
          status: 201,
          body: {
            text: 'Hey man this is my friends map, please be nicer :('
          },
          token: u2Token
        });

        const notifs = await prisma.notification.findMany({
          where: {
            type: NotificationType.MAP_REVIEW_COMMENT_POSTED,
            mapID: map.id,
            reviewID
          }
        });
        expect(
          notifs.find((notif) => notif.notifiedUserID === user1.id)
        ).toMatchObject({ userID: user2.id });
        expect(
          notifs.find((notif) => notif.notifiedUserID === map.submitterID)
        ).toMatchObject({ userID: user2.id });

        await prisma.notification.deleteMany({
          where: { type: NotificationType.MAP_REVIEW_COMMENT_POSTED }
        });
      });

      it('should NOT send a notification to the reviewer if commented on their own review', async () => {
        await req.post({
          url: `map-review/${reviewID}/comments`,
          status: 201,
          body: {
            text:
              'nah my bad this is fire, ' +
              'hit me up on soundcloud i can fix some tunes for you'
          },
          token: u1Token
        });

        const notifs = await prisma.notification.findMany({
          where: {
            type: NotificationType.MAP_REVIEW_COMMENT_POSTED,
            mapID: map.id,
            reviewID
          }
        });
        expect(notifs.some((notif) => notif.notifiedUserID === user1.id)).toBe(
          false
        );

        await prisma.notification.deleteMany({
          where: { type: NotificationType.MAP_REVIEW_COMMENT_POSTED }
        });
      });

      it("should only send one notification to the submitter if someone else commented on submitter's review", async () => {
        const review = await prisma.mapReview.create({
          data: {
            mainText: 'I forgot zones! :(',
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: map.submitterID } }
          }
        });
        await req.post({
          url: `map-review/${review.id}/comments`,
          status: 201,
          body: { text: 'well FIX IT!!!!' },
          token: u1Token
        });

        const notifs = await prisma.notification.findMany({
          where: {
            type: NotificationType.MAP_REVIEW_COMMENT_POSTED,
            mapID: map.id,
            reviewID: review.id
          }
        });
        expect(notifs.length).toBe(1);
        expect(notifs[0].notifiedUserID).toBe(map.submitterID);

        await prisma.notification.deleteMany({
          where: { type: NotificationType.MAP_REVIEW_COMMENT_POSTED }
        });
      });

      it('should send ONE notification to everyone who has already commented on the review', async () => {
        await req.post({
          url: `map-review/${reviewID}/comments`,
          status: 201,
          body: {
            text: 'what are you guys doing?'
          },
          token: await db.loginNewUser()
        });

        const notifs = await prisma.notification.findMany({
          where: {
            type: NotificationType.MAP_REVIEW_COMMENT_POSTED,
            mapID: map.id,
            reviewID
          }
        });
        expect(notifs.length).toBe(4);
        expect(notifs.some((n) => n.notifiedUserID === user1.id)).toBe(true);
        expect(notifs.some((n) => n.notifiedUserID === user2.id)).toBe(true);
        expect(notifs.some((n) => n.notifiedUserID === admin.id)).toBe(true);
        expect(notifs.some((n) => n.notifiedUserID === map.submitterID)).toBe(
          true
        );

        await prisma.notification.deleteMany({
          where: { type: NotificationType.MAP_REVIEW_COMMENT_POSTED }
        });
      });
    });

    describe('PATCH', () => {
      let user: User,
        token: string,
        adminToken: string,
        map: MMap,
        reviewID: number;

      beforeAll(async () => {
        [[user, token], adminToken] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser({ data: { roles: Role.ADMIN } })
        ]);

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });

        const review = await prisma.mapReview.create({
          data: {
            mainText: 'DISGUSTING',
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: user.id } },
            resolved: false
          }
        });
        reviewID = review.id;

        await prisma.mapReviewComment.createMany({
          data: [
            { reviewID, userID: user.id, text: 'no it isnt!!' },
            { reviewID, userID: user.id, text: 'we are the same person' },
            { reviewID, userID: user.id, text: 'oh' }
          ]
        });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      it('should 503 if the killswitch is true', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_REVIEWS: true
          },
          token: adminToken
        });

        await req.patch({
          url: 'map-review/comments/1',
          status: 503,
          body: {
            data: {
              text: 'something newer'
            }
          },
          token: token
        });

        await resetKillswitches(req, adminToken);
      });
    });

    describe('DELETE', () => {
      let user, token, adminToken, map, reviewID;

      beforeAll(async () => {
        [[user, token], adminToken] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser({ data: { roles: Role.ADMIN } })
        ]);

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });

        const review = await prisma.mapReview.create({
          data: {
            mainText: 'DISGUSTING',
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: user.id } },
            resolved: false
          }
        });
        reviewID = review.id;

        await prisma.mapReviewComment.createMany({
          data: [
            { reviewID, userID: user.id, text: 'no it isnt!!' },
            { reviewID, userID: user.id, text: 'we are the same person' },
            { reviewID, userID: user.id, text: 'oh' }
          ]
        });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      it('should 503 if the killswitch is true', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_REVIEWS: true
          },
          token: adminToken
        });

        await req.del({
          url: 'map-review/comments/1',
          status: 503,
          token: token
        });

        await resetKillswitches(req, adminToken);
      });
    });
  });
});
