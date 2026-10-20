import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { UserDto } from '../../backend/src/app/dto';
import { ChatBanType } from '@momentum/constants';
import { User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);
  const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

  describe('user - active chat bans in GET /user', () => {
    let user: User, token: string;

    before(async () => {
      [user, token] = await db.createAndLoginUser();

      await prisma.chatBan.createMany({
        data: [
          {
            type: ChatBanType.CHAT,
            reason: 'active permanent',
            expiresAt: null,
            targetID: user.id
          },
          {
            type: ChatBanType.VOICE,
            reason: 'active timed',
            expiresAt: inAnHour(),
            targetID: user.id
          },
          {
            type: ChatBanType.CHAT,
            reason: 'expired',
            expiresAt: anHourAgo(),
            targetID: user.id
          }
        ]
      });
    });

    after(async () => {
      await db.cleanup('chatBan', 'user');
    });

    it("should embed the local user's active chat bans", async () => {
      const res = await req.get({
        url: 'user',
        status: 200,
        validate: UserDto,
        token
      });

      assert.notEqual(res.body.chatBans, undefined);
      // Two active bans, the expired one excluded
      assert.equal(res.body.chatBans.length, 2);
      assert.deepEqual(
        res.body.chatBans.map((b) => b.type).sort(),
        [ChatBanType.CHAT, ChatBanType.VOICE].sort()
      );
      assert.equal(
        res.body.chatBans.some((b) => b.reason === 'expired'),
        false
      );
    });

    it('should not expose chat bans of another user via GET /users/{id}', async () => {
      const res = await req.get({
        url: `users/${user.id}`,
        status: 200,
        validate: UserDto,
        token
      });

      assert.equal(res.body.chatBans, undefined);
    });
  });
});
