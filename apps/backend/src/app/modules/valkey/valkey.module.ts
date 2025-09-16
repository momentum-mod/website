import { Module } from '@nestjs/common';
import { ValkeyService } from './valkey.service';

@Module({
  providers: [ValkeyService],
  exports: [ValkeyService]
})
export class ValkeyModule {}
