import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'discord.js';
import { Agent } from 'undici';

@Injectable()
export class DiscordService extends Client {
  enabled = false;

  constructor(config: ConfigService) {
    super({ intents: [] });
    // https://github.com/nodejs/undici/issues/1531#issuecomment-1178869993
    this.rest.setAgent(new Agent({ connect: { timeout: 60000 } }));

    const token = config.getOrThrow('discord.token');
    if (!token) return;

    this.token = token;
    this.rest.setToken(token);
    this.enabled = true;
  }
}
