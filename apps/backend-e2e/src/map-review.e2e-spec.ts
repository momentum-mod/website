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
  MapStatusNew,
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

        map = await db.createMap({ status: MapStatusNew.PUBLIC_TESTING });

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
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `map-review/${review.id}`,
          status: 403,
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
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

    describe('DELETE', () => {
      let user, token, u2Token, modToken, map, review;
      const assetPath = mapReviewAssetPath('1');

      beforeAll(async () => {
        [[user, token], u2Token, modToken] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser(),
          db.loginNewUser({ data: { roles: Role.MODERATOR } })
        ]);

        map = await db.createMap({
          status: MapStatusNew.PUBLIC_TESTING
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

        await fileStore.add(assetPath, Buffer.alloc(1024));
      });

      afterEach(async () => {
        await fileStore.delete(assetPath);
        await db.cleanup('mapReview');
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

      it("should 403 if map isn't in submission", async () => {
        const approvedMap = await db.createMap({
          status: MapStatusNew.APPROVED
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
});
