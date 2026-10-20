import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { MapReviewCommentDto } from '../../backend/src/app/dto';
import { MMap, User } from '@momentum/db';
import { NULL_ID, resetKillswitches } from '@momentum/test-utils';
import { MapStatus, NotificationType, Role } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('Map Reviews', () => {
  registerE2ETestFile();

  describe('map-review/{reviewID}/comments', () => {
    describe('GET', () => {
      let user: User, token: string, map: MMap, reviewID: number;

      before(async () => {
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

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

      it('should fetch a paginated list of comments', async () => {
        const res = await req.get({
          url: `map-review/${reviewID}/comments`,
          status: 200,
          validatePaged: { type: MapReviewCommentDto, count: 3 },
          token
        });

        assert.ok(Object.hasOwn(res.body.data[0], 'user'));
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

      before(async () => {
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

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

      it('should 400 if commenting on non-existing review', async () => {
        await req.post({
          url: `map-review/${NULL_ID}/comments`,
          status: 400,
          body: {
            data: {
              text: 'Not disgusting!!'
            }
          },
          token: u1Token
        });
      });

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
        assert.partialDeepStrictEqual(
          notifs.find((notif) => notif.notifiedUserID === user1.id),
          { userID: user2.id }
        );
        assert.partialDeepStrictEqual(
          notifs.find((notif) => notif.notifiedUserID === map.submitterID),
          { userID: user2.id }
        );

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
        assert.equal(
          notifs.some((notif) => notif.notifiedUserID === user1.id),
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
        assert.equal(notifs.length, 1);
        assert.equal(notifs[0].notifiedUserID, map.submitterID);

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
        assert.equal(notifs.length, 4);
        assert.equal(
          notifs.some((n) => n.notifiedUserID === user1.id),
          true
        );
        assert.equal(
          notifs.some((n) => n.notifiedUserID === user2.id),
          true
        );
        assert.equal(
          notifs.some((n) => n.notifiedUserID === admin.id),
          true
        );
        assert.equal(
          notifs.some((n) => n.notifiedUserID === map.submitterID),
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

      before(async () => {
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

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

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

      before(async () => {
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

      after(async () => {
        await db.cleanup('mMap', 'user');
      });

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
