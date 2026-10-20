import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Role, KillswitchType, Killswitches } from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { req, db, registerE2ETestFile } from './support/test-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/killswitch', () => {
    describe('GET', () => {
      let adminToken: string, modToken: string, u1Token: string;
      before(async () => {
        [adminToken, modToken, u1Token] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser()
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'adminActivity');
      });

      it('should respond with all killswitches', async () => {
        const response = await req.get({
          url: 'admin/killswitch',
          status: 200,
          token: adminToken
        });

        const killswitches = Object.fromEntries(
          Enum.values(KillswitchType).map((type: KillswitchType) => [
            type,
            false
          ])
        ) as Killswitches;

        assert.deepEqual(response.body, killswitches);
      });

      it('should 403 for moderators', async () => {
        await req.get({
          url: 'admin/killswitch',
          status: 403,
          token: modToken
        });
      });

      it('should respond with unauthorized', async () => {
        await req.get({
          url: 'admin/killswitch',
          status: 403,
          token: u1Token
        });
      });
    });

    describe('PATCH', () => {
      let adminToken: string, modToken: string, u1Token: string;
      before(async () => {
        [adminToken, modToken, u1Token] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser()
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'adminActivity', 'config');
      });

      it('should allow admin to patch killswitches', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_SUBMISSION: true
          },
          token: adminToken
        });
      });

      it('should allow admin to patch multiple killswitches', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            NEW_SIGNUPS: true,
            MAP_SUBMISSION: true
          },
          token: adminToken
        });
      });

      it('should not allow admins to patch incorrect killswitches', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 400,
          body: {
            FAKE_SWITCH: true
          },
          token: adminToken
        });
      });

      it('should fail if killswitch value is not a boolean', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 400,
          body: {
            MAP_SUBMISSION: 'this is a test'
          },
          token: adminToken
        });
      });

      it('should fail if one killswitch is valid and one not', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 400,
          body: {
            NEW_SIGNUPS: true,
            MAP_SUBMISSION: 'this is a test'
          },
          token: adminToken
        });
      });

      it('should 403 for moderators', async () => {
        await req.get({
          url: 'admin/killswitch',
          status: 403,
          token: modToken
        });
      });

      it('should respond with unauthorized', async () => {
        await req.patch({
          url: 'admin/killswitch',
          status: 403,
          body: {
            MAP_SUBMISSION: true
          },
          token: u1Token
        });
      });
    });
  });
});
