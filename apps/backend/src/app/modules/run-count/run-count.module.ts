import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { RunCountService } from './run-count.service';

@Module({
  imports: [DbModule, ValkeyModule],
  providers: [RunCountService],
  exports: [RunCountService]
})
export class RunCountModule {}
