import { after, before, describe, it } from 'node:test';
import {
  arrayContaining,
  E2ETestMMap,
  matchesPartial,
  objectContaining
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { MapDto } from '../../backend/src/app/dto';
import { MapStatus, Role } from '@momentum/constants';
import { User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/maps', () => {
    describe('GET', () => {
      let modToken: string,
        adminToken: string,
        reviewerToken: string,
        u1: User,
        u1Token: string,
        map1: E2ETestMMap,
        caMap: E2ETestMMap,
        faMap: E2ETestMMap;

      before(async () => {
        [modToken, adminToken, reviewerToken, [u1, u1Token], [map1]] =
          await Promise.all([
            db.loginNewUser({ data: { roles: Role.MODERATOR } }),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.REVIEWER } }),
            db.createAndLoginUser(),
            db.createMaps(4)
          ]);

        await db.createMap({ status: MapStatus.PRIVATE_TESTING });
        caMap = await db.createMap({ status: MapStatus.CONTENT_APPROVAL });
        faMap = await db.createMap({ status: MapStatus.FINAL_APPROVAL });
        await db.createMap({ status: MapStatus.PUBLIC_TESTING });
        await db.createMap({ status: MapStatus.DISABLED });
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'user', 'mMap');
      });

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'admin/maps',
          status: 200,
          validatePaged: { type: MapDto },
          token: adminToken
        });

        assert.ok(!Object.hasOwn(res.body, 'zones'));
      });

      it('should include maps with any map statuses by default', async () => {
        await req.get({
          url: 'admin/maps',
          status: 200,
          validatePaged: { type: MapDto, count: 9 },
          token: adminToken
        });
      });

      it('should be ordered by date', async () => {
        await req.sortByDateTest({
          url: 'admin/maps',
          validate: MapDto,
          token: adminToken
        });
      });

      it('should respond with filtered map data using the take parameter', async () => {
        await req.takeTest({
          url: 'admin/maps',
          validate: MapDto,
          token: adminToken
        });
      });

      it('should respond with filtered map data using the skip parameter', async () => {
        await req.skipTest({
          url: 'admin/maps',
          validate: MapDto,
          token: adminToken
        });
      });

      it('should respond with filtered map data using the search parameter', async () => {
        const map = await db.createMap({ name: 'aaaaa' }, true);

        await req.searchTest({
          url: 'admin/maps',
          token: adminToken,
          searchMethod: 'contains',
          searchString: 'aaaaa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });

        await prisma.mMap.delete({ where: { id: map.id } });
      });

      it('should respond with filtered map data using the submitter id parameter', async () => {
        await prisma.mMap.update({
          where: { id: map1.id },
          data: { submitterID: u1.id }
        });

        const res = await req.get({
          url: 'admin/maps',
          status: 200,
          query: { submitterID: u1.id },
          validatePaged: { type: MapDto, count: 1 },
          token: adminToken
        });

        assert.partialDeepStrictEqual(res.body.data[0], {
          submitterID: u1.id,
          id: map1.id
        });
      });

      it('should filter by maps when given the filter parameter', async () => {
        const res = await req.get({
          url: 'admin/maps',
          status: 200,
          query: {
            filter: [MapStatus.CONTENT_APPROVAL, MapStatus.FINAL_APPROVAL]
          },
          validatePaged: { type: MapDto, count: 2 },
          token: adminToken
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({ id: caMap.id }),
              objectContaining({ id: faMap.id })
            ])
          )
        );
      });

      it('should return 403 if a regular access token is given', async () => {
        await req.get({
          url: 'admin/maps',
          status: 403,
          token: u1Token
        });
      });

      it('should return 403 if a reviewer token is given', async () => {
        await req.get({
          url: 'admin/maps',
          status: 403,
          token: reviewerToken
        });
      });

      it('should accept if a mod access token is given', async () => {
        await req.get({
          url: 'admin/maps',
          status: 200,
          token: modToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/maps', 'get');
      });
    });
  });
});
