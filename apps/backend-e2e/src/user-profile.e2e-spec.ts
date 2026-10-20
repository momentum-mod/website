import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ProfileDto } from '../../backend/src/app/dto';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('User', () => {
  registerE2ETestFile();

  describe('user/profile', () => {
    describe('GET', () => {
      it("should respond with authenticated user's profile info", async () => {
        const [user, token] = await db.createAndLoginUser({
          data: { profile: { create: { bio: 'Hello' } } },
          include: { profile: true }
        });

        const res = await req.get({
          url: 'user/profile',
          status: 200,
          token,
          validate: ProfileDto
        });

        assert.equal(res.body.bio, (user as any).profile.bio);

        await prisma.user.deleteMany();
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/profile', 'get');
      });
    });
  });
});
