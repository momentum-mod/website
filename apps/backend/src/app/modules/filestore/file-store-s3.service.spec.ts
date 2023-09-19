import { Test, TestingModule } from '@nestjs/testing';
import { FileStoreS3Service } from './file-store-s3.service';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

describe('FileStoreS3Service', () => {
  let service: FileStoreS3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileStoreS3Service, ConfigService]
    }).compile();

    service = module.get<FileStoreS3Service>(FileStoreS3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('storeFile should store a file', async () => {
    const fileBuffer = Buffer.from('elephants');
    const fileKey = 'testKey';

    jest
      .spyOn(service['s3Client'], 'send')
      .mockImplementation(() => Promise.resolve());

    const result = await service.storeFile(fileBuffer, fileKey);

    expect(result.fileKey).toEqual(fileKey);
    expect(result.hash).toEqual(
      createHash('sha1').update(fileBuffer).digest('hex')
    );
  });

  it('copyFile should copy a file', async () => {
    const fromKey = 'fromKey';
    const toKey = 'toKey';

    jest
      .spyOn(service['s3Client'], 'send')
      .mockImplementation(() => Promise.resolve());

    const result = await service.copyFile(fromKey, toKey);

    expect(result).toEqual(true);
  });

  it('copyFile should return false if the file is missing', async () => {
    const fromKey = 'fromKey';
    const toKey = 'toKey';

    jest
      .spyOn(service['s3Client'], 'send')
      .mockImplementation(() => Promise.reject({ Code: 'NoSuchKey' }));

    const result = await service.copyFile(fromKey, toKey);

    expect(result).toEqual(false);
  });

  it('deleteFile should delete a file', async () => {
    const fileKey = 'fileKey';

    jest
      .spyOn(service['s3Client'], 'send')
      .mockImplementation(() => Promise.resolve());

    const result = await service.deleteFile(fileKey);

    expect(result).toEqual(true);
  });

  it('deleteFile should return false if the file is missing', async () => {
    const fileKey = 'fileKey';

    jest
      .spyOn(service['s3Client'], 'send')
      .mockImplementation(() => Promise.reject({ Code: 'NoSuchKey' }));

    const result = await service.deleteFile(fileKey);

    expect(result).toEqual(false);
  });

  it('deleteFiles should delete multiple files', async () => {
    const fileKeys = ['fileKey1', 'fileKey2'];

    jest
      .spyOn(service['s3Client'], 'send')
      .mockImplementation(() => Promise.resolve());

    const result = await service.deleteFiles(fileKeys);

    expect(result).toEqual(true);
  });

  it('deleteFiles should return false if any file is missing', async () => {
    const fileKeys = ['fileKey1', 'fileKey2'];

    jest
      .spyOn(service['s3Client'], 'send')
      .mockImplementation(() => Promise.reject({ Code: 'NoSuchKey' }));

    const result = await service.deleteFiles(fileKeys);

    expect(result).toEqual(false);
  });

  it('getFile should get a file', async () => {
    const fileKey = 'fileKey';

    jest.spyOn(service['s3Client'], 'send').mockImplementation(() =>
      Promise.resolve({
        Body: {
          transformToByteArray: () => new Uint8Array()
        }
      })
    );

    const result = await service.getFile(fileKey);

    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('getFile should return null if the file is missing', async () => {
    const fileKey = 'fileKey';

    jest
      .spyOn(service['s3Client'], 'send')
      .mockImplementation(() => Promise.reject({ Code: 'NoSuchKey' }));

    const result = await service.getFile(fileKey);

    expect(result).toBeNull();
  });
});
