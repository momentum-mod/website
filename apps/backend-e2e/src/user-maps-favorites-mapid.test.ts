import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('User', () => {
  registerE2ETestFile();

  describe('user/maps/favorites/{mapID}', () => {
    describe('GET', () => {
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

      it('should return 204 if the map is not in favorites', async () => {
        await prisma.mapFavorite.create({
          data: { userID: user.id, mapID: map.id }
        });

        await req.get({
          url: `user/maps/favorites/${map.id}`,
          token,
          status: 204
        });

        await prisma.mapFavorite.deleteMany();
      });

      it('should return 410 if the map is not in favorites', async () => {
        await req.get({
          url: `user/maps/favorites/${map.id}`,
          token,
          status: 410
        });
      });

      it("should return 410 if the map doesn't exist", async () => {
        await req.get({
          url: `user/maps/favorites/${NULL_ID}`,
          token,
          status: 410
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps/favorites/1', 'get');
      });
    });

    describe('PUT', () => {
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

      it('should add a new map to the local users favorites', async () => {
        let stats = await prisma.mapStats.findUnique({
          where: { mapID: map.id }
        });

        assert.equal(stats.favorites, 0);

        await req.put({
          url: `user/maps/favorites/${map.id}`,
          status: 204,
          token
        });

        const favorite = await prisma.mapFavorite.findFirst({
          where: { userID: user.id }
        });
        assert.equal(favorite.mapID, map.id);

        stats = await prisma.mapStats.findUnique({
          where: { mapID: map.id }
        });

        assert.equal(stats.favorites, 1);
      });

      it("should 404 if the map doesn't exist", async () => {
        await req.put({
          url: `user/maps/favorites/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 400 if the map is already in users favorites', async () => {
        await req.put({
          url: `user/maps/favorites/${map.id}`,
          status: 400,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps/favorites/1', 'put');
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

      it('should delete a map from the local users favorites', async () => {
        await prisma.mapFavorite.create({
          data: { userID: user.id, mapID: map.id }
        });

        await prisma.mapStats.update({
          where: { mapID: map.id },
          data: { favorites: 1 }
        });

        await req.del({
          url: `user/maps/favorites/${map.id}`,
          status: 204,
          token
        });

        const favorite = await prisma.mapFavorite.findFirst({
          where: { userID: user.id, mapID: map.id }
        });
        assert.equal(favorite, null);

        const stats = await prisma.mapStats.findUnique({
          where: { mapID: map.id }
        });

        assert.equal(stats.favorites, 0);
      });

      it('should 400 if the map is not in the local users favorites', async () => {
        await req.del({
          url: `user/maps/favorites/${map.id}`,
          status: 400,
          token
        });
      });

      it('should 404 if the map is not in the database', async () => {
        await req.del({
          url: `user/maps/favorites/${NULL_ID}`,
          status: 404,
          token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps/favorites/1', 'del');
      });
    });
  });
});
