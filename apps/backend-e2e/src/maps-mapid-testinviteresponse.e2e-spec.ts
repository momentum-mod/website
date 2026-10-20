import { afterEach, beforeEach, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin

import { MMap, User } from '@momentum/db';
import {
  MapStatus,
  MapTestInviteState,
  NotificationType
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { difference } from '@momentum/util-fn';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('Maps Part 2', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/testInviteResponse', () => {
    describe('PATCH', () => {
      let user: User, token: string, user2: User, map: MMap;
      beforeEach(async () => {
        [[user, token], [user2]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser()
        ]);

        map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          submitter: { connect: { id: user2.id } },
          testInvites: {
            create: { userID: user.id, state: MapTestInviteState.UNREAD }
          }
        });
        await prisma.notification.create({
          data: {
            notifiedUserID: user.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        });
      });

      afterEach(async () => {
        await db.cleanup('mMap', 'user', 'notification');
      });

      it('should successfully accept a test invite', async () => {
        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 204,
          body: { accept: true },
          token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.partialDeepStrictEqual(createdRequests, [
          { userID: user.id, state: MapTestInviteState.ACCEPTED }
        ]);
      });

      it('should successfully decline a test invite', async () => {
        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 204,
          body: { accept: false },
          token
        });
      });

      it('should delete the notification corresponding to the testing request', async () => {
        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 204,
          body: { accept: true },
          token
        });
        const notifs = await prisma.notification.findMany();
        assert.equal(notifs.length, 0);
      });

      it('should 404 if the user does not have a test invite', async () => {
        await prisma.mapTestInvite.deleteMany();

        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 404,
          body: { accept: false },
          token
        });
      });

      it("should 400 if body does not contain an 'accept' value", async () => {
        await req.patch({
          url: `maps/${map.id}/testInviteResponse`,
          status: 400,
          body: {},
          token
        });
      });

      it('should 404 in the map does not exist', async () => {
        await req.patch({
          url: `maps/${NULL_ID}/testInviteResponse`,
          status: 404,
          body: { accept: true },
          token
        });
      });

      for (const status of difference(Enum.values(MapStatus), [
        MapStatus.PRIVATE_TESTING
      ]))
        it(`should 403 if the map is in ${MapStatus[status]}`, async () => {
          await prisma.mMap.update({
            where: { id: map.id },
            data: { status }
          });

          await req.patch({
            url: `maps/${map.id}/testInviteResponse`,
            status: 403,
            body: { accept: true },
            token
          });
        });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest(
          `maps/${map.id}/testInviteResponse`,
          'patch'
        );
      });
    });
  });
});
