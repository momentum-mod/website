import { after, before, beforeEach, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { FollowDto, FollowStatusDto } from '../../backend/src/app/dto';
import { ActivityType } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('User', () => {
  registerE2ETestFile();

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
});
