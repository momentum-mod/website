import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileStoreService } from './file-store.service';
import { LargeFileStoreService } from './large-file-store.service';
import { arrayFrom } from '@momentum/util-fn';
import { mockDeep, resetDeepMockCalls } from '@momentum/test-utils';

describe('FileStoreS3Service', () => {
  let service: FileStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: FileStoreService,
          useClass: LargeFileStoreService
        }
      ]
    })
      .useMocker((token) => {
        return token === ConfigService
          ? // Just mocking every S3 config value to a random string is fine here
            { getOrThrow: mock.fn(() => 'sausage') }
          : mockDeep(token);
      })
      .compile();

    service = module.get<FileStoreService>(FileStoreService);
  });

  afterEach(() => {
    mock.restoreAll();
    resetDeepMockCalls();
  });

  it('should be defined', () => {
    assert.notStrictEqual(service, undefined);
  });

  describe('storeFile', () => {
    it('should store a file', async () => {
      const fileBuffer = Buffer.from('elephants');
      const fileKey = 'testKey';

      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.resolve());

      const result = await service.storeFile(fileBuffer, fileKey);

      assert.deepStrictEqual(result.fileKey, fileKey);
      assert.deepStrictEqual(
        result.hash,
        createHash('sha1').update(fileBuffer).digest('hex')
      );
    });
  });

  describe('copyFile', () => {
    it('should copy a file', async () => {
      const fromKey = 'fromKey';
      const toKey = 'toKey';

      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.resolve());

      const result = await service.copyFile(fromKey, toKey);

      assert.deepStrictEqual(result, true);
    });

    it('should return false if the file is missing', async () => {
      const fromKey = 'fromKey';
      const toKey = 'toKey';

      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.reject({ Code: 'NoSuchKey' }));

      const result = await service.copyFile(fromKey, toKey);

      assert.deepStrictEqual(result, false);
    });
  });

  describe('deleteFile', () => {
    it('deleteFile should delete a file', async () => {
      const fileKey = 'fileKey';

      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.resolve());

      const result = await service.deleteFile(fileKey);

      assert.deepStrictEqual(result, true);
    });

    it('deleteFile should return false if the file is missing', async () => {
      const fileKey = 'fileKey';

      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.reject({ Code: 'NoSuchKey' }));

      const result = await service.deleteFile(fileKey);

      assert.deepStrictEqual(result, false);
    });

    it('deleteFiles should delete multiple files', async () => {
      const fileKeys = ['fileKey1', 'fileKey2'];

      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.resolve());

      const result = await service.deleteFiles(fileKeys);

      assert.deepStrictEqual(result, true);
    });

    it('deleteFiles should handle deleting LOADS of files', async () => {
      const fileKeys = arrayFrom(10000, (k) => `fileKey${k}`);

      const spy = mock.method(service['s3Client'], 'send');
      spy.mock.mockImplementation(() => Promise.resolve());

      const result = await service.deleteFiles(fileKeys);

      assert.strictEqual(spy.mock.calls.length, 10);

      assert.deepStrictEqual(result, true);
    });

    it('deleteFiles should return false if any file is missing', async () => {
      const fileKeys = ['fileKey1', 'fileKey2'];

      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.reject({ Code: 'NoSuchKey' }));

      const result = await service.deleteFiles(fileKeys);

      assert.deepStrictEqual(result, false);
    });
  });

  describe('getFile', () => {
    it('getFile should get a file', async () => {
      const fileKey = 'fileKey';

      mock.method(service['s3Client'], 'send').mock.mockImplementation(() =>
        Promise.resolve({
          Body: {
            transformToByteArray: () => new Uint8Array()
          }
        })
      );

      const result = await service.getFile(fileKey);

      assert.ok(result instanceof Uint8Array);
    });

    it('getFile should return null if the file is missing', async () => {
      const fileKey = 'fileKey';

      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.reject({ Code: 'NoSuchKey' }));

      const result = await service.getFile(fileKey);

      assert.strictEqual(result, null);
    });
  });

  describe('listFileKeys', () => {
    it('listFileKeys should list file keys', async () => {
      mock.method(service['s3Client'], 'send').mock.mockImplementation(() =>
        Promise.resolve({
          KeyCount: 2,
          Contents: [{ Key: 'key1' }, { Key: 'key2' }]
        })
      );

      const result = await service.listFileKeys('prefix');
      assert.deepStrictEqual(result, ['key1', 'key2']);
    });

    it('listFileKeys should return an empty array for an empty bucket', async () => {
      mock
        .method(service['s3Client'], 'send')
        .mock.mockImplementation(() => Promise.resolve({ KeyCount: 0 }));

      const result = await service.listFileKeys('prefix');

      assert.deepStrictEqual(result, []);
    });
  });
});
