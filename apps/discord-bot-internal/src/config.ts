import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { PathConstants } from './path-constants';

interface Config {
  /* Constants */
  environment: string; // Unused, will be used for logging or removed
  guild_id: string; // Yes

  /* Loads from env */
  bot_token: string; // Discord bot token
  twitch_api_client_id: string; // Twitch client id
  twitch_api_client_secret: string; // Twitch client secret

  /* Roles */
  admin_id: string; // Admin role id
  livestream_mention_role_id: string; // Live stream ping role id
  moderator_id: string; // Moderator role id
  media_verified_role: string; // Trusted role id
  media_blacklisted_role: string; // Blacklisted role id

  /* Channels */
  streamer_channel: string; // Live stream channel id
  admin_bot_channel: string; // Bot config channel id
  join_log_channel: string; // New members channel id
  message_history_channel: string; // Message history channel id

  /* Live stream module config */
  minimum_stream_viewers_announce: number; // Miminal viewers count for stream to appear in channel
  stream_update_interval: number; // Update interval in minutes
  twitch_user_bans: string[]; // Banned twitch users from live streams

  /* Join log module config */
  new_account_emote: string; // Reaction emote marking new accounts

  /* Trusted module config */
  media_minimum_days: number; // Days for getting trusted role
  media_minimum_messages: number; // Messages for getting trusted role

  /* Twitch API config */
  twitch_momentum_mod_game_id: string;

  /* Custom module storage */
  custom_commands: { [key: string]: CustomCommand };
}

export interface CustomCommand {
  title: string;
  description: null | string;
  button_url: null | string;
  button_label: null | string;
  thumbnail_url: null | string;
  image_url: null | string;
  user: string;
  creation_timestamp: string;
}

const environmentConfigMap = {
  BOT_TOKEN: 'bot_token',
  TWITCH_API_CLIENT_ID: 'twitch_api_client_id',
  TWITCH_API_CLIENT_SECRET: 'twitch_api_client_secret'
} as const;

class Config {
  constructor(private path = 'config.json') {
    this.reload();
  }

  loadFromEnv() {
    for (const [envKey, configKey] of Object.entries(environmentConfigMap)) {
      if (!process.env[envKey]) {
        throw new Error(`Environment key ${envKey} is not set.`);
      }

      this[configKey] = process.env[envKey];
    }
  }

  reload() {
    const file = readFileSync(this.path);
    Object.assign(this, JSON.parse(file.toString()) as Config);
    this.loadFromEnv();
  }

  async reloadAsync() {
    const file = await readFile(this.path);
    Object.assign(this, JSON.parse(file.toString()) as Config);
    this.loadFromEnv();
  }

  async save() {
    // Removing environment variables and config path
    const cleanConfig = {
      ...this,
      ...Object.fromEntries(
        Object.values(environmentConfigMap).map((k) => [k, undefined])
      ),
      path: undefined
    };
    await writeFile(this.path, JSON.stringify(cleanConfig, null, 2));
  }
}

export const config = new Config(PathConstants.configFile);
