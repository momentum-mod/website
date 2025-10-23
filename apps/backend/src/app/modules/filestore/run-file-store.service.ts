import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStoreService } from './file-store.service';

@Injectable()
export class RunFileStoreService extends FileStoreService {
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
