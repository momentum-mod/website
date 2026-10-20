import { after, beforeEach, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { UserDto } from '../../backend/src/app/dto';
import { ActivityType, AdminActivityType, Role } from '@momentum/constants';
import { User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

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

  describe('admin/users/merge', () => {
    describe('POST', () => {
      let admin: User,
        adminToken: string,
        modToken: string,
        u1: User,
        u1Token: string,
        u2: User,
        mergePlaceholder: User,
        mergeUser: User;

      beforeEach(async () => {
        [
          [admin, adminToken],
          modToken,
          [u1, u1Token],
          u2,
          mergePlaceholder,
          mergeUser
        ] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser({ data: { roles: Role.PLACEHOLDER } }),
          db.createUser()
        ]);

        await prisma.follow.createMany({
          data: [
            { followeeID: u1.id, followedID: mergePlaceholder.id },
            {
              followeeID: u2.id,
              followedID: mergePlaceholder.id,
              notifyOn: ActivityType.MAP_APPROVED,
              createdAt: new Date('12/24/2021')
            },
            {
              followeeID: u2.id,
              followedID: mergeUser.id,
              notifyOn: ActivityType.MAP_UPLOADED,
              createdAt: new Date('12/25/2021')
            },
            { followeeID: mergeUser.id, followedID: mergePlaceholder.id }
          ]
        });

        await prisma.activity.create({
          data: {
            type: ActivityType.REPORT_FILED,
            userID: mergePlaceholder.id,
            data: 1n
          }
        });
      });

      after(async () => {
        await db.cleanup('user', 'adminActivity');
      });

      it('should merge two accounts together', async () => {
        const res = await req.post({
          url: 'admin/users/merge',
          status: 201,
          body: { placeholderID: mergePlaceholder.id, userID: mergeUser.id },
          token: adminToken,
          validate: UserDto
        });

        assert.equal(res.body.id, mergeUser.id);
        assert.equal(res.body.alias, mergeUser.alias);

        // u1 was following mergePlaceholder, that should be transferred to mergeUser.
        const u1Follow = await prisma.follow.findFirst({
          where: { followeeID: u1.id, followedID: mergeUser.id }
        });
        assert.ok(u1Follow.followeeID);

        // u2 was following mergePlaceholder and mergeUser, the creation data should be earliest
        // of the two and the notifyOn flags combined.
        const u2Follow = await prisma.follow.findFirst({
          where: { followeeID: u2.id, followedID: mergeUser.id }
        });
        assert.deepEqual(new Date(u2Follow.createdAt), new Date('12/24/2021'));
        assert.equal(
          u2Follow.notifyOn,
          ActivityType.MAP_APPROVED | ActivityType.MAP_UPLOADED
        );

        // mergeUser was following mergePlaceholder, that should be deleted
        const mergeUserFollows = await prisma.follow.findFirst({
          where: { followeeID: mergeUser.id, followedID: mergePlaceholder.id }
        });
        assert.equal(mergeUserFollows, null);

        // mergePlaceholder's activities should have been transferred to mergeUser

        const mergeUserActivities = await prisma.activity.findFirst({
          where: { userID: mergeUser.id }
        });
        assert.equal(mergeUserActivities.type, ActivityType.REPORT_FILED);

        // Placeholder should have been deleted
        const mergePlaceholderDB = await prisma.user.findFirst({
          where: { id: mergePlaceholder.id }
        });
        assert.equal(mergePlaceholderDB, null);

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.USER_MERGE
        );
      });

      it('should 400 if the user to merge from is not a placeholder', async () => {
        await req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: u1.id, userID: mergeUser.id },
          token: adminToken
        });
      });

      it('should 400 if the user to merge from does not exist', async () => {
        await req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: NULL_ID, userID: mergeUser.id },
          token: adminToken
        });
      });

      it('should 400 if the user to merge to does not exist', async () => {
        await req.post({
          url: 'admin/users/merge',
          status: 400,
          body: { placeholderID: mergePlaceholder.id, userID: NULL_ID },
          token: adminToken
        });
      });

      it('should 400 if the user to merge are the same user', async () => {
        await req.post({
          url: 'admin/users/merge',
          status: 400,
          body: {
            placeholderID: mergePlaceholder.id,
            userID: mergePlaceholder.id
          },
          token: adminToken
        });
      });

      it('should 403 when the user requesting is only a moderator', async () => {
        await req.post({
          url: 'admin/users/merge',
          status: 403,
          body: { placeholderID: mergePlaceholder.id, userID: mergeUser.id },
          token: modToken
        });
      });

      it('should 403 when the user requesting is not an admin', async () => {
        await req.post({
          url: 'admin/users/merge',
          status: 403,
          body: { placeholderID: mergePlaceholder.id, userID: mergeUser.id },
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/users/merge', 'post');
      });
    });
  });
});
