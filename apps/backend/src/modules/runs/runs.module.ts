import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RepoModule } from '../repo/repo.module';
import { FileStoreModule } from '../filestore/file-store.module';

@Module({
  imports: [RepoModule, FileStoreModule],
  controllers: [RunsController],
  providers: [RunsService],
  exports: [RunsService]
})
export class RunsModule {}
