import { Module } from '@nestjs/common';
import { FileStoreCloudService } from './file-store-cloud.service';

@Module({
    providers: [FileStoreCloudService],
    exports: [FileStoreCloudService]
})
export class FileStoreModule {}
