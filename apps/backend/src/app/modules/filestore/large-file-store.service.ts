import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStoreService } from './file-store.service';

@Injectable()
export class LargeFileStoreService extends FileStoreService {
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
