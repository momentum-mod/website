import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { MapReviewDto } from '../../backend/src/app/dto';
import {
  Gamemode,
  mapReviewAssetPath,
  MapStatus,
  Role,
  TrackType
} from '@momentum/constants';
import { MapReview, MMap, User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  fileStore,
  registerE2ETestFile
} from './support/test-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/map-review/{reviewID}', () => {
    describe('PATCH', () => {
      let u1: User,
        u1Token: string,
        adminToken: string,
        modToken: string,
        reviewerToken: string,
        map: MMap,
        review: MapReview;

      before(async () => {
        [[u1, u1Token], adminToken, modToken, reviewerToken] =
          await Promise.all([
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.MODERATOR } }),
            db.loginNewUser({ data: { roles: Role.REVIEWER } })
          ]);

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });
      });

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

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

      afterEach(async () => {
        await db.cleanup('mapReview');
      });

      it('should allow admin to update resolved status', async () => {
        const res = await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 200,
          body: { resolved: true },
          validate: MapReviewDto,
          token: adminToken
        });

        assert.equal(res.body.resolved, true);
      });

      it('should allow mod to update resolved status', async () => {
        const res = await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 200,
          body: { resolved: true },
          validate: MapReviewDto,
          token: modToken
        });

        assert.equal(res.body.resolved, true);
      });

      it('should allow reviewer to update resolved status', async () => {
        const res = await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 200,
          body: { resolved: true },
          validate: MapReviewDto,
          token: reviewerToken
        });

        assert.equal(res.body.resolved, true);
      });

      it('should not allow admin to update approved status', async () => {
        await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 400, // 400s since does even exist on dto
          body: { approves: true },
          token: adminToken
        });
      });

      it('should not allow review author to access', async () => {
        await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 403,
          body: { resolved: true },
          token: u1Token
        });
      });

      it('should 400 for bad update data', async () => {
        await req.patch({
          url: `admin/map-review/${review.id}`,
          status: 400,
          body: { mainText: "admins cant rewrite people's reviews" },
          token: adminToken
        });
      });

      it('should return 404 for missing review', async () => {
        await req.patch({
          url: `admin/map-review/${NULL_ID}`,
          status: 404,
          body: { resolved: true },
          token: adminToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/map-review/1', 'patch');
      });
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

      before(async () => {
        [[u1, u1Token], adminToken, modToken, reviewerToken] =
          await Promise.all([
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.MODERATOR } }),
            db.loginNewUser({ data: { roles: Role.REVIEWER } })
          ]);

        map = await db.createMap({ status: MapStatus.PUBLIC_TESTING });
      });

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

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

      afterEach(async () => {
        await db.cleanup('mapReview');
      });

      it('should allow an admin to delete a map review', async () => {
        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 204,
          token: adminToken
        });

        assert.equal(
          await prisma.mapReview.findUnique({ where: { id: review.id } }),
          null
        );
      });

      it('should delete any stored assets', async () => {
        assert.equal(await fileStore.exists(assetPath), true);

        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 204,
          token: adminToken
        });

        assert.equal(await fileStore.exists(assetPath), false);
      });

      it('should allow a mod to delete a map review', async () => {
        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 204,
          token: modToken
        });

        assert.equal(
          await prisma.mapReview.findUnique({ where: { id: review.id } }),
          null
        );
      });

      it('should not allow a reviewer to delete a map review', async () => {
        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 403,
          token: reviewerToken
        });
      });

      it('should not allow review author to delete a map review (via this endpoint)', async () => {
        await req.del({
          url: `admin/map-review/${review.id}`,
          status: 403,
          token: u1Token
        });
      });

      it('should return 404 for missing review', async () => {
        await req.del({
          url: `admin/map-review/${NULL_ID}`,
          status: 404,
          token: adminToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/map-review/1', 'del');
      });
    });
  });
});
