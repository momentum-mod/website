import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { MapNotifyDto } from '../../backend/src/app/dto';
import { ActivityType } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('User', () => {
  registerE2ETestFile();

  describe('user/notifyMap/{mapID}', () => {
    describe('GET ', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should return a MapNotify DTO for a given user and map', async () => {
        const activityType = ActivityType.WR_ACHIEVED;
        await prisma.mapNotify.create({
          data: { userID: user.id, mapID: map.id, notifyOn: activityType }
        });

        const res = await req.get({
          url: `user/notifyMap/${map.id}`,
          status: 200,
          token,
          validate: MapNotifyDto
        });

        assert.equal(res.body.notifyOn, activityType);

        await prisma.mapNotify.deleteMany();
      });

      it('should 404 if the user does not have mapnotify for given map', async () => {
        await req.get({
          url: `user/notifyMap/${map.id}`,
          status: 404,
          token
        });
      });

      it('should 404 if the target map does not exist', async () => {
        await req.get({
          url: `user/notifyMap/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/notifyMap/1', 'get');
      });
    });

    describe('PUT ', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should update map notification status with existing notifications', async () => {
        await prisma.mapNotify.create({
          data: {
            userID: user.id,
            mapID: map.id,
            notifyOn: ActivityType.WR_ACHIEVED
          }
        });

        const newActivityType = ActivityType.PB_ACHIEVED;
        await req.put({
          url: `user/notifyMap/${map.id}`,
          status: 204,
          body: { notifyOn: newActivityType },
          token
        });

        const mapNotify = await prisma.mapNotify.findFirst({
          where: { userID: user.id }
        });
        assert.equal(mapNotify.notifyOn, newActivityType);

        await prisma.mapNotify.deleteMany();
      });

      it('should create new map notification status if no existing notifications', async () => {
        const activityType = ActivityType.REVIEW_MADE;
        await req.put({
          url: `user/notifyMap/${map.id}`,
          status: 204,
          body: { notifyOn: activityType },
          token
        });

        const mapNotify = await prisma.mapNotify.findFirst({
          where: { userID: user.id }
        });
        assert.equal(mapNotify.notifyOn, activityType);

        await prisma.mapNotify.deleteMany();
      });

      it('should 400 is the body is invalid', async () => {
        await req.put({
          url: `user/notifyMap/${map.id}`,
          status: 400,
          body: { notifyOn: 'this is a sausage' },
          token
        });
      });

      it('should 404 if the target map does not exist', async () => {
        await req.put({
          url: `user/notifyMap/${NULL_ID}`,
          status: 404,
          body: { notifyOn: ActivityType.PB_ACHIEVED },
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/notifyMap/1', 'put');
      });
    });

    describe('DELETE', () => {
      let user, token, map;

      before(async () => {
        await ([[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should remove the user from map notifications list', async () => {
        await prisma.mapNotify.create({
          data: {
            userID: user.id,
            mapID: map.id,
            notifyOn: ActivityType.REVIEW_MADE
          }
        });

        await req.del({
          url: `user/notifyMap/${map.id}`,
          status: 204,
          token
        });

        const mapNotify = await prisma.mapNotify.findFirst({
          where: { userID: user.id }
        });
        assert.equal(mapNotify, null);
      });

      it('should 404 if the user is not following the map', async () => {
        await req.del({
          url: `user/notifyMap/${map.id}`,
          status: 404,
          token
        });
      });

      it('should 404 if the target map does not exist', async () => {
        await req.del({
          url: `user/notifyMap/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/notifyMap/1', 'del');
      });
    });
  });
});
