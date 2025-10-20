import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStoreS3Service } from './file-store-s3.service';

@Injectable()
export class LargeFileStoreService extends FileStoreS3Service {
  constructor(config: ConfigService) {
    super({
      region: config.getOrThrow('storage.region'),
      endpointUrl: config.getOrThrow('storage.endpointUrl'),
      accessKeyID: config.getOrThrow('storage.accessKeyID'),
      secretAccessKey: config.getOrThrow('storage.secretAccessKey'),
      bucket: config.getOrThrow('storage.bucketName')
    });
  }
}
