import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AdminActivityDto } from '../../backend/src/app/dto';
import { AdminActivityType, Role } from '@momentum/constants';
import { User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/activities/{adminID}', () => {
    describe('GET', () => {
      let admin: User, adminToken: string, u1: User, u1Token: string;
      before(async () => {
        [[admin, adminToken], [u1, u1Token]] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser()
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'adminActivity');
      });

      it('should return a list of admin activities', async () => {
        const oldUser = await prisma.user.findUnique({
          where: { id: u1.id },
          include: { profile: true }
        });

        await req.patch({
          url: `admin/users/${u1.id}`,
          status: 204,
          body: { alias: 'Update Alias' },
          token: adminToken
        });

        const newUser = await prisma.user.findUnique({
          where: { id: u1.id },
          include: { profile: true }
        });

        const adminActivities = await req.get({
          url: 'admin/activities/' + admin.id,
          status: 200,
          token: adminToken,
          validatePaged: { type: AdminActivityDto, count: 1 }
        });

        assert.ok(Object.hasOwn(adminActivities.body, 'data'));

        const userUpdateActivity = adminActivities.body.data.find(
          (activity) => activity.type == AdminActivityType.USER_UPDATE
        );

        assert.deepEqual(
          userUpdateActivity.oldData,
          JSON.parse(JSON.stringify(oldUser))
        );
        assert.deepEqual(
          userUpdateActivity.newData,
          JSON.parse(JSON.stringify(newUser))
        );
        assert.equal(userUpdateActivity.target, oldUser.id);
      });

      it('should 403 when the user tries to get admin activities', async () => {
        await req.get({
          url: 'admin/activities/' + admin.id,
          status: 403,
          token: u1Token
        });
      });

      it('should 403 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/activities/' + admin.id, 'get');
      });
    });
  });
});
