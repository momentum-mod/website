import { Module } from '@nestjs/common';
import { FileStoreCloudService } from './cloud.service';
import { FileStoreUtilsService } from './utils.service';

@Module({
    providers: [FileStoreCloudService, FileStoreUtilsService],
    exports: [FileStoreCloudService]
})
export class FileStoreModule {}
