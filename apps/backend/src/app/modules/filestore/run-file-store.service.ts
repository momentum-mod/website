import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStoreS3Service } from './file-store-s3.service';

@Injectable()
export class RunFileStoreService extends FileStoreS3Service {
  constructor(config: ConfigService) {
    let configPrefix = 'runStorage';
    const bucket = config.get(configPrefix + '.bucketName');
    if (!bucket) configPrefix = 'storage';

    super({
      region: config.getOrThrow(configPrefix + '.region'),
      endpointUrl: config.getOrThrow(configPrefix + '.endpointUrl'),
      accessKeyID: config.getOrThrow(configPrefix + '.accessKeyID'),
      secretAccessKey: config.getOrThrow(configPrefix + '.secretAccessKey'),
      bucket: config.getOrThrow(configPrefix + '.bucketName')
    });
  }
}
