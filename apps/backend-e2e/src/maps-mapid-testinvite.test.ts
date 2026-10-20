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
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/testInvite', () => {
    describe('PUT', () => {
      let u1: User,
        u1Token: string,
        u2: User,
        u2Token: string,
        u3: User,
        u4: User,
        map: MMap;
      beforeEach(async () => {
        [[u1, u1Token], [u2, u2Token], u3, u4] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]);

        map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          submitter: { connect: { id: u1.id } }
        });
      });

      afterEach(async () => {
        await db.cleanup('mMap', 'user', 'notification');
      });

      it('should create MapTestInvites', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u2.id, u3.id, u4.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.partialDeepStrictEqual(createdRequests, [
          { userID: u2.id, state: MapTestInviteState.UNREAD },
          { userID: u3.id, state: MapTestInviteState.UNREAD },
          { userID: u4.id, state: MapTestInviteState.UNREAD }
        ]);
      });

      it('should remove any MapTestInvites not on the userID', async () => {
        await prisma.mapTestInvite.create({
          data: {
            mapID: map.id,
            userID: u2.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u3.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.partialDeepStrictEqual(createdRequests, [
          { userID: u3.id, state: MapTestInviteState.UNREAD }
        ]);
      });

      it('should remove all MapTestInvites for an empty array', async () => {
        await prisma.mapTestInvite.create({
          data: {
            mapID: map.id,
            userID: u2.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.equal(createdRequests.length, 0);
      });

      it('should leave any existing MapTestInvites contained in the userIDs unaffected', async () => {
        await prisma.mapTestInvite.createMany({
          data: [
            {
              mapID: map.id,
              userID: u2.id,
              state: MapTestInviteState.DECLINED
            },
            {
              mapID: map.id,
              userID: u3.id,
              state: MapTestInviteState.ACCEPTED
            }
          ]
        });

        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u3.id, u4.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestInvite.findMany();
        assert.partialDeepStrictEqual(createdRequests, [
          { userID: u3.id, state: MapTestInviteState.ACCEPTED },
          { userID: u4.id, state: MapTestInviteState.UNREAD }
        ]);
      });

      it('should create map testing request notifications for users', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u3.id, u4.id] },
          token: u1Token
        });

        const notifs = await prisma.notification.findMany({
          where: { type: NotificationType.MAP_TESTING_INVITE }
        });
        assert.partialDeepStrictEqual(notifs, [
          {
            notifiedUserID: u3.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          },
          {
            notifiedUserID: u4.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        ]);
      });

      it('should delete map testing request notifications if users are uninvited', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u3.id, u4.id] },
          token: u1Token
        });
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 204,
          body: { userIDs: [u4.id] },
          token: u1Token
        });
        const notifs = await prisma.notification.findMany({
          where: { type: NotificationType.MAP_TESTING_INVITE }
        });
        assert.partialDeepStrictEqual(notifs, [
          {
            notifiedUserID: u4.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        ]);
      });

      it('should 404 in the map does not exist', async () => {
        await req.put({
          url: `maps/${NULL_ID}/testInvite`,
          status: 404,
          body: { userIDs: [] },
          token: u1Token
        });
      });

      it('should 400 if userIDs array is missing', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 400,
          body: {},
          token: u1Token
        });
      });

      it('should 403 if the user is not the submitter of the map', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 403,
          body: { userIDs: [u3.id] },
          token: u2Token
        });
      });

      it('should 400 if the userIDs contains an ID that does not exist', async () => {
        await req.put({
          url: `maps/${map.id}/testInvite`,
          status: 400,
          body: { userIDs: [NULL_ID] },
          token: u1Token
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

          await req.put({
            url: `maps/${map.id}/testInvite`,
            status: 403,
            body: { userIDs: [u3.id] },
            token: u1Token
          });
        });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest(`maps/${map.id}/testInvite`, 'put');
      });
    });
  });
});
