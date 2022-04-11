import { Module } from '@nestjs/common';
import { FileStoreLocalService } from './local.service';
import { FileStoreCloudService } from './cloud.service';
import { FileStoreUtilsService } from './utils.service';

@Module({
    providers: [FileStoreCloudService, FileStoreLocalService, FileStoreUtilsService],
    exports: [FileStoreCloudService, FileStoreLocalService]
})
export class FileStoreModule {}
