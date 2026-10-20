import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { UserDto } from '../../backend/src/app/dto';
import { AdminActivityType, Role } from '@momentum/constants';
import { User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('Admin', () => {
  registerE2ETestFile();

  async function expectAdminActivityWasCreated(
    userID: number,
    type: AdminActivityType
  ) {
    const activities = await prisma.adminActivity.findMany({
      where: { userID }
    });
    assert.ok(activities.some((activity) => activity.type === type));
  }

  describe('admin/users', () => {
    describe('POST', () => {
      let admin: User,
        adminToken: string,
        modToken: string,
        nonAdminToken: string;

      before(async () => {
        [[admin, adminToken], modToken, nonAdminToken] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser()
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'adminActivity');
      });

      it('should successfully create a placeholder user', async () => {
        const res = await req.post({
          url: 'admin/users',
          status: 201,
          body: { alias: 'Burger' },
          token: adminToken,
          validate: UserDto
        });

        assert.equal(res.body.alias, 'Burger');
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_CREATE_PLACEHOLDER
        );
      });

      it('should 403 when the user requesting only is a moderator', async () => {
        await req.post({
          url: 'admin/users',
          status: 403,
          body: { alias: 'Barry 2' },
          token: modToken
        });
      });

      it('should 403 when the user requesting is not an admin', async () => {
        await req.post({
          url: 'admin/users',
          status: 403,
          body: { alias: 'Barry 2' },
          token: nonAdminToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/users', 'post');
      });
    });
  });
});
