import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  FILES_PATH,
  matchesPartial,
  NULL_ID,
  stringContaining
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin
import { Config } from '../../backend/src/app/config';
import { MapImageDto } from '../../backend/src/app/dto';
import { readFileSync } from 'node:fs';
import {
  AdminActivityType,
  MapStatuses,
  MapStatus,
  Role
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { arrayFrom } from '@momentum/util-fn';
import path from 'node:path';
import {
  prisma,
  req,
  db,
  fileStore,
  registerE2ETestFile,
  resetKillswitches
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/images', () => {
    describe('GET', () => {
      let token, map, id1, id2;
      before(async () => {
        [id1, id2] = [db.uuid(), db.uuid()];
        [token, map] = await Promise.all([
          db.loginNewUser(),
          db.createMap({ images: [id2, id1] })
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with a list of images', async () => {
        const res = await req.get({
          url: `maps/${map.id}/images`,
          status: 200,
          validateArray: { type: MapImageDto, length: 2 },
          token
        });

        assert.ok(
          matchesPartial(res.body, [
            {
              small: stringContaining(`${id2}-small.jpg`),
              medium: stringContaining(`${id2}-medium.jpg`),
              large: stringContaining(`${id2}-large.jpg`),
              xl: stringContaining(`${id2}-xl.jpg`)
            },
            {
              small: stringContaining(`${id1}-small.jpg`),
              medium: stringContaining(`${id1}-medium.jpg`),
              large: stringContaining(`${id1}-large.jpg`),
              xl: stringContaining(`${id1}-xl.jpg`)
            }
          ])
        );
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/images`,
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should 404 if map does not exist', async () => {
        await req.get({ url: `maps/${NULL_ID}/images`, status: 404, token });
      });
    });

    describe('PUT', () => {
      let user, token, map;

      const imageBuffer = readFileSync(path.join(FILES_PATH, '2560_1440.png'));

      before(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
      });

      beforeEach(async () => {
        map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          submitter: { connect: { id: user.id } }
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('mMap', 'adminActivity'),
          fileStore.deleteDirectory('img')
        ]);
      });

      it('should create a map image for the specified map', async () => {
        const res = await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          data: { imageIDs: ['0'] },
          validateArray: { type: MapImageDto, length: 1 },
          token
        });

        const updatedMap = await prisma.mMap.findFirst();
        for (const size of ['small', 'medium', 'large', 'xl']) {
          assert.notEqual(res.body[0][size], undefined);
          assert.equal(
            await fileStore.exists(`img/${updatedMap.images[0]}-${size}.jpg`),
            true
          );
        }
      });

      it('should 503 if killswitch guard is active for maps/{mapID}/images PUT', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_SUBMISSION: true
          },
          token: adminToken
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 503,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          data: { imageIDs: ['0'] },
          token
        });

        await resetKillswitches();
      });

      it('should reorder images correctly, and delete any unused ones', async () => {
        const [id1, id2] = [db.uuid(), db.uuid()];

        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [id1, id2] }
        });

        const buf = Buffer.alloc(1);
        for (const id of [id1, id2])
          for (const size of ['small', 'medium', 'large', 'xl'])
            await fileStore.add(`img/${id}-${size}.jpg`, buf);

        for (const id of [id1, id2])
          for (const size of ['small', 'medium', 'large', 'xl'])
            assert.equal(await fileStore.exists(`img/${id}-${size}.jpg`), true);

        const res = await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' },
            { file: imageBuffer, field: 'images', fileName: 'hello2.png' }
          ],
          data: { imageIDs: ['0', id1, '1'] },
          validateArray: { type: MapImageDto, length: 3 },
          token
        });

        const { images } = await prisma.mMap.findFirst();
        assert.ok(
          matchesPartial(
            res.body,
            images.map((id) => ({
              id,
              small: stringContaining(`${id}-small.jpg`),
              medium: stringContaining(`${id}-medium.jpg`),
              large: stringContaining(`${id}-large.jpg`),
              xl: stringContaining(`${id}-xl.jpg`)
            }))
          )
        );
        assert.equal(images.length, 3);
        assert.equal(images[0][8], '-'); // World's laziest uuid validation, whatever
        assert.equal(images[1], id1);
        assert.equal(images[2][8], '-');

        for (const id of images)
          for (const size of ['small', 'medium', 'large', 'xl'])
            assert.equal(await fileStore.exists(`img/${id}-${size}.jpg`), true);

        for (const size of ['small', 'medium', 'large', 'xl'])
          assert.equal(await fileStore.exists(`img/${id2}-${size}.jpg`), false);
      });

      it('should reorder with no files provided', async () => {
        const [id1, id2] = [db.uuid(), db.uuid()];

        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [id1, id2] }
        });

        const res = await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          data: { imageIDs: [id2, id1] },
          validateArray: { type: MapImageDto, length: 3 },
          token
        });

        assert.equal(res.body[0].id, id2);
        assert.equal(res.body[1].id, id1);

        const { images } = await prisma.mMap.findUnique({
          where: { id: map.id }
        });
        assert.deepEqual(images, [id2, id1]);
      });

      it('should 400 when the map image limit has been reached', async () => {
        map = await prisma.mMap.update({
          where: { id: map.id },
          data: { images: arrayFrom(5, () => db.uuid()) }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          data: { imageIDs: [...map.images, '0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token
        });
      });

      it('should 400 if the map image has bad extension', async () => {
        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          files: [{ file: 'map.zon', field: 'images' }],
          data: { imageIDs: ['0'] },
          token
        });
      });

      it('should 400 for PNG with wrong dimensions', async () => {
        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          files: [{ file: '1920_1080.png', field: 'images' }],
          data: { imageIDs: ['0'] },
          token
        });
      });

      it('should 400 for JPG with correct dimensions', async () => {
        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          files: [{ file: '2560_1440.jpg', field: 'images' }],
          data: { imageIDs: ['0'] },
          token
        });
      });

      it("should 400 when the image file is greater than the config's max image file size", async () => {
        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          data: { imageIDs: ['0'] },
          files: [
            { file: Buffer.alloc(Config.limits.imageSize + 1), field: 'images' }
          ],
          token
        });
      });

      it('should 403 if the user is not the submitter of the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { create: { realAlias: 'George Weasley' } } }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 403,
          data: { imageIDs: ['0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { connect: { id: user.id } } }
        });
      });

      it('should allow a mod user', async () => {
        const modToken = await db.loginNewUser({
          data: { roles: Role.MODERATOR }
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          data: { imageIDs: ['0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token: modToken
        });
      });

      it('should generate an admin activity for a mod user', async () => {
        const [mod, modToken] = await db.createAndLoginUser({
          data: { roles: Role.MODERATOR }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          data: { imageIDs: ['0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token: modToken
        });

        const activity = await prisma.adminActivity.findFirst();
        assert.partialDeepStrictEqual(activity, {
          userID: mod.id,
          type: AdminActivityType.MAP_UPDATE
        });
      });

      it('should allow an admin user', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.putAttach({
          url: `maps/${map.id}/images`,
          status: 200,
          data: { imageIDs: ['0'] },
          files: [
            { file: imageBuffer, field: 'images', fileName: 'hello.png' }
          ],
          token: adminToken
        });
      });

      for (const status of Enum.values(MapStatus)) {
        const shouldPass = MapStatuses.IN_SUBMISSION.includes(status);
        const expectedStatus = shouldPass ? 200 : 403;

        it(`should ${expectedStatus} if the map is not in the ${MapStatus[status]} state`, async () => {
          await prisma.mMap.update({
            where: { id: map.id },
            data: { status }
          });

          await req.putAttach({
            url: `maps/${map.id}/images`,
            status: expectedStatus,
            data: { imageIDs: ['0'] },
            files: [
              { file: imageBuffer, field: 'images', fileName: 'hello.png' }
            ],
            token
          });

          await prisma.mMap.update({
            where: { id: map.id },
            data: { status: MapStatus.PRIVATE_TESTING }
          });
        });
      }

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/1/images', 'put');
      });
    });
  });
});
