import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'discord.js';
import { Agent } from 'undici';

@Injectable()
export class DiscordService {
  private enabled = false;

  isEnabled(): this is Client {
    return this.enabled;
  }

  private constructor() {
    const client = new Client({ intents: [] });

    // https://github.com/nodejs/undici/issues/1531#issuecomment-1178869993
    client.rest.setAgent(new Agent({ connect: { timeout: 60000 } }));

    Object.assign(this, client);
  }

  static async factory(config: ConfigService) {
    const client = new DiscordService();

    const token = config.getOrThrow('discord.token');
    if (!token) return client;
    client.enabled = true;

    if (!client.isEnabled()) return client;

    client.token = token;
    client.rest.setToken(token);

    try {
      await client.guilds.fetch(config.getOrThrow('discord.guild'));
    } catch (e) {
      Logger.error(
        'Failed to fetch Discord guild, Discord client will be disabled.'
      );
      Logger.error(e);
      client.enabled = false;
    }

    return client;
  }
}
