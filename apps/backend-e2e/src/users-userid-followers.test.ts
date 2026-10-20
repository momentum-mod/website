import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { FollowDto } from '../../backend/src/app/dto';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Users', () => {
  registerE2ETestFile();

  describe('users/{userID}/followers', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u3;

      before(async () => {
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

      after(async () => {
        await db.cleanup('user');
      });

      // These are just above, in reverse
      it('should respond with a list of users that follow the specified user', async () => {
        const res = await req.get({
          url: `users/${u2.id}/followers`,
          status: 200,
          validatePaged: { type: FollowDto, count: 2 },
          token: u1Token
        });

        for (const follow of res.body.data) {
          assert.ok(Object.hasOwn(follow.followee, 'profile'));
          assert.ok(Object.hasOwn(follow.followed, 'profile'));
        }
      });

      it('should respond with a limited list of followers for the user when using the take query param', async () => {
        await req.takeTest({
          url: `users/${u2.id}/followers`,
          validate: FollowDto,
          token: u1Token
        });
      });

      it('should respond with a different list of followers for the user when using the skip query param', async () => {
        await req.skipTest({
          url: `users/${u2.id}/followers`,
          validate: FollowDto,
          token: u1Token
        });
      });

      it('should return an empty list for a user who isnt following anyone', async () => {
        await req.get({
          url: `users/${u2.id}/follows`,
          status: 200,
          validatePaged: { type: FollowDto, count: 0 },
          token: u1Token
        });
      });

      it('should return an empty list for a user who isnt followed by anyone', async () => {
        await req.get({
          url: `users/${u1.id}/followers`,
          status: 200,
          validatePaged: { type: FollowDto, count: 0 },
          token: u1Token
        });
      });
    });
  });
});
