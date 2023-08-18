import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';

@Module({
  imports: [DbModule.forRoot(), FileStoreModule],
  controllers: [RunsController],
  providers: [RunsService],
  exports: [RunsService]
})
export class RunsModule {}
