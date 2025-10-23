import { Module } from '@nestjs/common';
import { FileStoreService } from './file-store.service';
import { LargeFileStoreService } from './large-file-store.service';
import { RunFileStoreService } from './run-file-store.service';

@Module({
  providers: [
    {
      provide: FileStoreService,
      useClass: LargeFileStoreService
    },
    RunFileStoreService
  ],
  exports: [FileStoreService, RunFileStoreService]
})
export class FileStoreModule {}
