import { Module } from '@nestjs/common';
import { FileStoreS3Service } from './file-store-s3.service';
import { FileStoreService } from './file-store.service';

// This provides the S3 store whenever FileStoreService is needed.
//
// If we ever want an alternative file store service in the future (e.g. local
// storage), just change the `useClass` to another class/set conditional using
// an env var.
const FILE_STORE_SERVICE_PROVIDER = {
  provide: FileStoreService,
  useClass: FileStoreS3Service
};

@Module({
  providers: [FILE_STORE_SERVICE_PROVIDER],
  exports: [FILE_STORE_SERVICE_PROVIDER]
})
export class FileStoreModule {}
