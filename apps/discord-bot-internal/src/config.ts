import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { PathConstants } from './path-constants';

interface Config {
  // Constants
  guild_id: string;

  // Loads from env
  /** Discord bot token */
  bot_token: string;
  /** Twitch client id */
  twitch_api_client_id: string;
  /** Twitch client secret */
  twitch_api_client_secret: string;

  // Roles
  /** Admin role id */
  admin_id: string;
  /** Live stream ping role id */
  livestream_mention_role_id: string;
  /** Moderator role id */
  moderator_id: string;
  /** Trusted role id */
  media_verified_role: string;
  /** Blacklisted role id */
  media_blacklisted_role: string;
  /** Team member role */
  team_member_role: string;

  // Channels
  /** Live stream channel id */
  streamer_channel: string;
  /** Bot config channel id */
  admin_bot_channel: string;
  /** Bot config channel id */
  moderator_channel: string;
  /** New members log channel id */
  join_log_channel: string;
  /** Message history channel id */
  message_history_channel: string;

  // Live stream module config
  /** Miminal viewers count for stream to appear in channel */
  minimum_stream_viewers_announce: number;
  /** Update interval in minutes */
  stream_update_interval: number;
  /** Banned twitch users from live streams */
  twitch_user_bans: string[];

  // Join log module config
  /** Reaction emote id marking new accounts */
  new_account_emote: string;

  // Trusted module config
  /** Days for getting trusted role */
  media_minimum_days: number;
  /** Messages for getting trusted role */
  media_minimum_messages: number;

  // Twitch API config
  /** Internal twitch game id for Momentum Mod */
  twitch_momentum_mod_game_id: string;

  /** Any channels that should always be shown in livestream channel if live */
  twitch_momentum_mod_official_channels: string[];

  // Spam monitor config
  /** Number of channels in time window to trigger spam */
  spam_channel_limit: number;
  /** Time window in ms for spam detection */
  spam_time_window_ms: number;
  /** Duration in minutes to mute for spam */
  spam_timeout_duration_minutes: number;

  // Role module config
  /** Roles that can be gived by mods through a bot */
  giveable_roles: string[];

  // Meeting notifications config
  /** Meetings channel id */
  meeting_channel: string;
  /** Timezone for meeting times */
  meeting_timezone: string;
  /** Array of alternating meeting times */
  meeting_times: [number, number][];
  /** Index shift of the next meeting time */
  meeting_time_shift: number;
  /** Cron schedule in UTC for when to send the meeting document */
  metting_doc_schedule: string;
  /** Cron schedule in UTC for when to send the meeting reminder */
  metting_reminder_schedule: string;
  /** URL for fetching new meeting documents */
  metting_doc_url: string | null;
  /** Password fetching new meeting documents */
  meeting_doc_password: string | null;

  // Custom module storage
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
  BOT_TOKEN: { key: 'bot_token', isNullable: false },
  TWITCH_API_CLIENT_ID: { key: 'twitch_api_client_id', isNullable: false },
  TWITCH_API_CLIENT_SECRET: {
    key: 'twitch_api_client_secret',
    isNullable: false
  },
  MEETING_DOC_URL: { key: 'metting_doc_url', isNullable: true },
  MEETING_DOC_PASSWORD: { key: 'meeting_doc_password', isNullable: true }
} as const;

class Config {
  constructor(private path = 'config.json') {
    this.reload();
  }

  loadFromEnv() {
    for (const [envKey, { key: configKey, isNullable }] of Object.entries(
      environmentConfigMap
    )) {
      if (!process.env[envKey]) {
        if (!isNullable)
          throw new Error(`Environment key ${envKey} is not set.`);
        else {
          this[configKey] = null;
          continue;
        }
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
