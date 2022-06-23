import { Module } from '@nestjs/common';
import { FileStoreCloudService } from './file-store-cloud.service';
import { FileStoreUtilsService } from './file-store-utils.service';

@Module({
    providers: [FileStoreCloudService, FileStoreUtilsService],
    exports: [FileStoreCloudService]
})
export class FileStoreModule {}
