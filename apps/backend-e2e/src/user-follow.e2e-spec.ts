import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('User', () => {
  registerE2ETestFile();

  describe('user/follow', () => {
    describe('POST', () => {
      let u1, u1Token, u2, u3;

      before(async () => {
        await ([[u1, u1Token], u2, u3] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]));
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should follow multiple users', async () => {
        await req.post({
          url: 'user/follow',
          status: 201,
          body: { targetUserIDs: [u2.id, u3.id] },
          token: u1Token
        });

        const userFollows = await prisma.follow.findMany({
          where: { followeeID: u1.id }
        });

        assert.equal(userFollows.length, 2);
      });

      it('should 400 for invalid body', async () => {
        await req.post({
          url: 'user/follow',
          status: 400,
          body: '1,2,3,4,the,minecraft,movie' as any,
          token: u1Token
        });

        await req.post({
          url: 'user/follow',
          status: 400,
          body: 'TRUNCATE public."User"' as any,
          token: u1Token
        });
      });

      it('should 404 if any of the target users do not exist', async () => {
        await req.post({
          url: 'user/follow',
          status: 404,
          body: { targetUserIDs: [u2.id, NULL_ID] },
          token: u1Token
        });
      });
    });
  });
});
