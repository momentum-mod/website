import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: DiscordService,
      useFactory: async (config: ConfigService) => {
        const discord = new DiscordService(config);
        if (discord.enabled) {
          await discord.guilds.fetch(config.getOrThrow('discordGuild'));
        }
        return discord;
      },
      inject: [ConfigService]
    }
  ],
  exports: [DiscordService]
})
export class DiscordModule {}
