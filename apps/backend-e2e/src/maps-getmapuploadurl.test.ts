import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Config } from '../../backend/src/app/config';
import crypto from 'node:crypto';
import {
  req,
  db,
  fileStore,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/getMapUploadUrl', () => {
    describe('GET', () => {
      let user, token;
      before(async () => {
        [user, token] = await db.createAndLoginUser();
      });

      after(async () => {
        await fileStore.deleteDirectory('upload_tmp');
      });

      it('should create pre-signed url for file in upload_tmp directory', async () => {
        const fileBuf = crypto.randomBytes(10);

        const preSignedUrlRes = await req.get({
          url: 'maps/getMapUploadUrl',
          query: {
            fileSize: fileBuf.length
          },
          status: 200,
          token
        });

        await fileStore.putToPreSignedUrl(preSignedUrlRes.body.url, fileBuf);

        const userIDObjects = await fileStore.list(`upload_tmp/${user.id}`);
        assert.equal(userIDObjects.length, 1);

        const storedObject = await fileStore.get(userIDObjects[0]);
        assert.deepEqual(storedObject, fileBuf);
      });

      it('should delete old file when new url created', async () => {
        await req.get({
          url: 'maps/getMapUploadUrl',
          query: {
            fileSize: 10
          },
          status: 200,
          token
        });

        const userIDObjects = await fileStore.list(`upload_tmp/${user.id}`);
        assert.equal(userIDObjects.length, 0);
      });

      it('should 400 for too big files', async () => {
        await req.get({
          url: 'maps/getMapUploadUrl',
          query: {
            fileSize: Config.limits.bspSize + 1
          },
          status: 400,
          token
        });
      });

      it('should 400 if file size is not specified', async () => {
        await req.get({
          url: 'maps/getMapUploadUrl',
          status: 400,
          token
        });
      });

      it('should delete old file with next request errored', async () => {
        const fileBuf = crypto.randomBytes(10);

        const preSignedUrlRes = await req.get({
          url: 'maps/getMapUploadUrl',
          query: {
            fileSize: fileBuf.length
          },
          status: 200,
          token
        });

        await fileStore.putToPreSignedUrl(preSignedUrlRes.body.url, fileBuf);

        await req.get({
          url: 'maps/getMapUploadUrl',
          status: 400,
          token
        });

        const userIDObjects = await fileStore.list(`upload_tmp/${user.id}`);
        assert.equal(userIDObjects.length, 0);
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/getMapUploadUrl', 'get');
      });
    });
  });
});
