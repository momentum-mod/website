import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: DiscordService,
      useFactory: DiscordService.factory,
      inject: [ConfigService]
    }
  ],
  exports: [DiscordService]
})
export class DiscordModule {}
