// noinspection DuplicatedCode

import { MapReviewCommentDto, MapReviewDto } from '../../backend/src/app/dto';

import { PrismaClient } from '@prisma/client';
import {
  DbUtil,
  FileStoreUtil,
  NULL_ID,
  RequestUtil
} from '@momentum/test-utils';
import {
  Gamemode,
  mapReviewAssetPath,
  MapStatus,
  NotificationType,
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

  afterAll(() => teardownE2ETestEnvironment(app));

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
                trackNum: 0,
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

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      beforeEach(async () => {
        review1 = await prisma.mapReview.create({
          data: {
            mainText: 'delete this stage or i will have you killed',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 0,
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

        review2 = await prisma.mapReview.create({
          data: {
            mainText: 'what is this!!!!',
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u2.id } },
            resolved: false
          }
        });
      });

      afterEach(() => db.cleanup('mapReview'));

      it('should successfully update a review', async () => {
        const res = await req.patch({
          url: `map-review/${review1.id}`,
          status: 200,
          body: {
            mainText: 'actually i like this stage',
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 0,
                gamemode: Gamemode.AHOP,
                tier: 1,
                gameplayRating: 10
              }
            ]
          },
          validate: MapReviewDto,
          token: u1Token
        });

        expect(res.body.mainText).toBe('actually i like this stage');
      });

      it('should 400 for bad update data', () =>
        req.patch({
          url: `map-review/${review1.id}`,
          status: 400,
          body: {
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                gameplayRating: 10
              }
            ]
          },
          token: u1Token
        }));

      it('should 403 if not the reviewer', async () =>
        req.patch({
          url: `map-review/${review1.id}`,
          status: 403,
          body: { mainText: 'i dont like this review' },
          token: u2Token
        }));

      it('should allow official reviewer to resolve their review', async () =>
        req.patch({
          url: `map-review/${review2.id}`,
          status: 200,
          body: { resolved: true },
          token: u2Token
        }));

      it('should not allow unofficial reviewer to resolve their review', async () =>
        req.patch({
          url: `map-review/${review1.id}`,
          status: 200,
          body: { resolved: true },
          token: u1Token
        }));

      it('should return 403 if map not in submission', async () => {
        const approvedMap = await db.createMap({
          status: MapStatus.APPROVED,
          submitter: { connect: { id: u2.id } }
        });

        const rev = await prisma.mapReview.create({
          data: {
            mainText: 'what is this!!!!',
            mmap: { connect: { id: approvedMap.id } },
            reviewer: { connect: { id: u2.id } },
            resolved: false
          }
        });

        await req.patch({
          url: `map-review/${rev.id}`,
          status: 403,
          body: { mainText: 'how' },
          token: u2Token
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
      let user, token, u2Token, modToken, map, review, notif;
      const assetPath = mapReviewAssetPath('1');

      beforeAll(async () => {
        [[user, token], u2Token, modToken] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser(),
          db.loginNewUser({ data: { roles: Role.MODERATOR } })
        ]);

        map = await db.createMap({
          status: MapStatus.PUBLIC_TESTING
        });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      beforeEach(async () => {
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
            resolved: true
          }
        });
        notif = await prisma.notification.create({
          data: {
            type: NotificationType.REVIEW_POSTED,
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
        await db.cleanup('mapReview', 'notification');
      });

      it('should allow a user to delete their own review', () =>
        req.del({
          url: `map-review/${review.id}`,
          status: 204,
          token: token
        }));

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

      it('should delete relevant notifications', async () => {
        await req.del({
          url: `map-review/${review.id}`,
          status: 204,
          token: token
        });
        const notifs = await prisma.notification.findMany();
        expect(notifs).toHaveLength(0);
      });

      it("should 403 if map isn't in submission", async () => {
        const approvedMap = await db.createMap({
          status: MapStatus.APPROVED
        });

        const rev = await prisma.mapReview.create({
          data: {
            mainText: 'where am i',
            mmap: { connect: { id: approvedMap.id } },
            reviewer: { connect: { id: user.id } },
            resolved: true
          }
        });

        await req.del({
          url: `map-review/${rev.id}`,
          status: 403,
          token: token
        });
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
      let user, token, mod, modToken, map, reviewID;

      beforeAll(async () => {
        [[user, token], [mod, modToken]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser({ data: { roles: Role.MODERATOR } })
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
  });
});
