import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ProfileDto } from '../../backend/src/app/dto';
import { NULL_ID } from '@momentum/test-utils';
import { req, db, registerE2ETestFile } from './support/test-environment';

describe('Users', () => {
  registerE2ETestFile();

  describe('GET /users/{userID}/profile', () => {
    let user, token;

    before(async () => {
      await ([user, token] = await db.createAndLoginUser({
        data: { profile: { create: { bio: 'Sausages' } } }
      }));
    });

    after(async () => {
      await db.cleanup('user');
    });

    it('should respond with the specified users profile info', async () => {
      const res = await req.get({
        url: `users/${user.id}/profile`,
        status: 200,
        validate: ProfileDto,
        token
      });

      assert.equal(res.body.bio, 'Sausages');
    });

    it('should 404 if the profile is not found', async () => {
      await req.get({ url: `users/${NULL_ID}/profile`, status: 404, token });
    });
  });
});
