import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { MapReviewDto } from '../../backend/src/app/dto';
import { MapReview, MMap, Notification, User } from '@momentum/db';
import { NULL_ID, resetKillswitches } from '@momentum/test-utils';
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
  prisma,
  req,
  db,
  fileStore,
  valkey,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Map Reviews', () => {
  registerE2ETestFile();

  describe('map-review/{reviewID}', () => {
    describe('GET', () => {
      let user, token, map, review;
      before(async () => {
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

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

      it('should return the requested review', async () => {
        const response = await req.get({
          url: `map-review/${review.id}`,
          status: 200,
          validate: MapReviewDto,
          token: token
        });
        assert.partialDeepStrictEqual(response.body, {
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

      it('should return 404 for a nonexistent review', async () => {
        await req.get({
          url: `map-review/${NULL_ID}`,
          status: 404,
          token: token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('map-review/1', 'get');
      });
    });

    describe('PATCH', () => {
      let u1, u1Token, u2, u2Token, map, review1, review2;

      before(async () => {
        [[u1, u1Token], [u2, u2Token]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser({ data: { roles: Role.REVIEWER } })
        ]);
      });

      after(async () => {
        await db.cleanup('user');
      });

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

      afterEach(async () => {
        await db.cleanup('mMap');
      });

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

        assert.equal(res.body.mainText, 'actually i like this stage');
        assert.equal(res.body.approves, true);
      });

      it('should 400 for bad update data', async () => {
        await req.patch({
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
        });
      });

      it('should 403 if not the reviewer', async () => {
        await req.patch({
          url: `map-review/${review1.id}`,
          status: 403,
          body: { mainText: 'i dont like this review' },
          token: u2Token
        });
      });

      it('should allow official reviewer to resolve their review', async () => {
        await req.patch({
          url: `map-review/${review2.id}`,
          status: 200,
          body: { resolved: true },
          token: u2Token
        });
      });

      it('should allow unofficial reviewer to resolve their review', async () => {
        await req.patch({
          url: `map-review/${review1.id}`,
          status: 200,
          body: { resolved: true },
          token: u1Token
        });
      });

      it('should allow official reviewer to mark their review as approves', async () => {
        await req.patch({
          url: `map-review/${review2.id}`,
          status: 200,
          body: { approves: true },
          token: u2Token
        });
      });

      it('should not allow unofficial reviewer mark their review as approved', async () => {
        await req.patch({
          url: `map-review/${review1.id}`,
          status: 403,
          body: { approves: true },
          token: u1Token
        });
      });

      it('should update review stats', async () => {
        const before = await prisma.mapReviewStats.findUnique({
          where: { mapID: map.id }
        });
        assert.partialDeepStrictEqual(before, {
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
        assert.partialDeepStrictEqual(after, {
          total: 2,
          approvals: 1,
          resolved: 1,
          unresolved: 1
        });
      });

      it('should return 404 for missing review', async () => {
        await req.patch({
          url: `map-review/${NULL_ID}`,
          status: 404,
          body: { mainText: 'what' },
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('map-review/1', 'patch');
      });
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

      before(async () => {
        [[user, token], u2Token, modToken] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser({ data: { roles: Role.REVIEWER } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } })
        ]);
      });

      after(async () => {
        await db.cleanup('user');
      });

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

      it('should allow a user to delete their own review', async () => {
        await req.del({
          url: `map-review/${review.id}`,
          status: 204,
          token: token
        });
      });

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

        await resetKillswitches(valkey);
      });

      it("should not allow another user to delete someone else's review", async () => {
        await req.del({
          url: `map-review/${review.id}`,
          status: 403,
          token: u2Token
        });
      });

      // needs to use admin endpoint
      it('should not allow a mod to delete a review', async () => {
        await req.del({
          url: `map-review/${review.id}`,
          status: 403,
          token: modToken
        });
      });

      it('should delete any stored assets', async () => {
        assert.equal(await fileStore.exists(assetPath), true);

        await req.del({
          url: `map-review/${review.id}`,
          status: 204,
          token: token
        });

        assert.equal(await fileStore.exists(assetPath), false);
      });

      it('should update stats', async () => {
        const before = await prisma.mapReviewStats.findUnique({
          where: { mapID: map.id }
        });
        assert.partialDeepStrictEqual(before, {
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
        assert.partialDeepStrictEqual(after, {
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
        assert.equal(notifs.length, 0);
      });

      it('should return 404 for trying to delete a nonexistent review for a map', async () => {
        await req.del({
          url: `map-review/${NULL_ID}`,
          status: 404,
          token: token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('map-review/1', 'del');
      });
    });
  });
});
