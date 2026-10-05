import { Module } from '@nestjs/common';
import { TwitchController } from './twitch.controller';
import { TwitchService } from './twitch.service';
import { ValkeyModule } from '../valkey/valkey.module';

@Module({
  imports: [ValkeyModule],
  controllers: [TwitchController],
  providers: [TwitchService],
  exports: [TwitchService]
})
export class TwitchModule {}
