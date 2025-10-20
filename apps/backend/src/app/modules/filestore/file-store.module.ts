import { Module } from '@nestjs/common';
import { FileStoreService } from './file-store.service';
import { LargeFileStoreService } from './large-file-store.service';
import { RunFileStoreService } from './run-file-store.service';

// This provides the S3 store whenever FileStoreService is needed.
//
// If we ever want an alternative file store service in the future (e.g. local
// storage), just change the `useClass` to another class/set conditional using
// an env var.
const FILE_STORE_SERVICE_PROVIDER = {
  provide: FileStoreService,
  useClass: LargeFileStoreService
};

@Module({
  providers: [FILE_STORE_SERVICE_PROVIDER, RunFileStoreService],
  exports: [FileStoreService, RunFileStoreService]
})
export class FileStoreModule {}
