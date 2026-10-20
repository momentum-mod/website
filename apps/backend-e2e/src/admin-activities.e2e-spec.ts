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
} from './support/test-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/activities', () => {
    describe('GET', () => {
      let admin: User, adminToken: string, mod: User, u1: User, u1Token: string;
      before(async () => {
        [[admin, adminToken], mod, [u1, u1Token]] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createUser({ data: { roles: Role.MODERATOR } }),
          db.createAndLoginUser()
        ]);

        // Seperate creates for different createdAt
        await prisma.adminActivity.create({
          data: {
            type: AdminActivityType.MAP_UPDATE,
            target: 1,
            oldData: {},
            newData: { someData: 'yes' },
            user: { connect: { id: admin.id } }
          }
        });
        await prisma.adminActivity.create({
          data: {
            type: AdminActivityType.USER_UPDATE,
            target: u1.id,
            oldData: {},
            newData: { profile: { alias: 'yes' } },
            user: { connect: { id: mod.id } }
          }
        });
        await prisma.adminActivity.create({
          data: {
            type: AdminActivityType.USER_DELETE,
            target: u1.id,
            oldData: {},
            newData: { roles: Role.DELETED },
            user: { connect: { id: admin.id } }
          }
        });
      });

      after(async () => {
        await db.cleanup('user', 'adminActivity');
      });

      it('should return a list of all sorted admin activities', async () => {
        const adminActivities = await req.get({
          url: 'admin/activities',
          status: 200,
          token: adminToken,
          validatePaged: { type: AdminActivityDto, count: 3 }
        });

        assert.ok(Object.hasOwn(adminActivities.body, 'data'));

        assert.deepEqual(
          adminActivities.body.data[0].type,
          AdminActivityType.USER_DELETE
        );
        assert.deepEqual(
          adminActivities.body.data[1].type,
          AdminActivityType.USER_UPDATE
        );
      });

      it('should return a filtered list of all admin activities', async () => {
        const adminActivities = await req.get({
          url: 'admin/activities',
          status: 200,
          token: adminToken,
          query: {
            filter: [
              AdminActivityType.MAP_UPDATE,
              AdminActivityType.USER_UPDATE
            ]
          },
          validatePaged: { type: AdminActivityDto, count: 2 }
        });

        assert.ok(Object.hasOwn(adminActivities.body, 'data'));

        assert.deepEqual(
          adminActivities.body.data[0].type,
          AdminActivityType.USER_UPDATE
        );
        assert.deepEqual(
          adminActivities.body.data[1].type,
          AdminActivityType.MAP_UPDATE
        );
      });

      it('should 403 when the user tries to get admin activities', async () => {
        await req.get({
          url: 'admin/activities',
          status: 403,
          token: u1Token
        });
      });

      it('should 403 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/activities', 'get');
      });
    });
  });
});
