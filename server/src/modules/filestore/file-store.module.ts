import { Module } from '@nestjs/common';
import { FileStoreCloudService } from './file-store-cloud.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [FileStoreCloudService],
    exports: [FileStoreCloudService]
})
export class FileStoreModule {}
