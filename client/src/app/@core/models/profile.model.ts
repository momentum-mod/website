import {TwitterAuth} from './auth-twitter.model';
import {DiscordAuth} from './auth-discord.model';
import {TwitchAuth} from './auth-twitch.model';

export interface UserProfile {
  id: string;
  alias: string;
  avatarURL: string;
  bio?: string;
  twitterAuth?: TwitterAuth;
  discordAuth?: DiscordAuth;
  youtubeName?: string;
  twitchAuth?: TwitchAuth;
}
