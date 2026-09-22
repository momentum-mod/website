import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValkeyService } from '../valkey/valkey.service';
import { PagedResponseDto, TwitchStreamDto } from '../../dto';
import { TwitchStream } from '@momentum/constants';

export const TWITCH_STREAMS_CACHE_KEY = 'twitch:streams';
export const MOMENTUM_MOD_GAME_ID = '2043449207';
export const TWITCH_STREAMS_CACHE_TTL = 300; // 5 minutes in seconds

@Injectable()
export class TwitchService {
  private readonly logger = new Logger('Twitch Service');

  constructor(
    private readonly config: ConfigService,
    private readonly valkey: ValkeyService
  ) {}

  private async fetchStreamsFromTwitch(): Promise<TwitchStream[]> {
    const clientId = this.config.get<string>('twitch.clientId');
    const clientSecret = this.config.get<string>('twitch.clientSecret');

    if (!clientId || !clientSecret) {
      this.logger.warn(
        'Twitch client credentials not configured; cannot fetch streams.'
      );
      return [];
    }

    try {
      const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(
          `OAuth request failed with status ${tokenResponse.status}`
        );
      }

      const { access_token } = (await tokenResponse.json()) as {
        access_token?: string;
      };

      if (!access_token) {
        throw new Error('OAuth response did not return an access_token');
      }

      const streamsUrl = new URL('https://api.twitch.tv/helix/streams');
      streamsUrl.searchParams.set('game_id', MOMENTUM_MOD_GAME_ID);

      const streamsResponse = await fetch(streamsUrl.toString(), {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${access_token}`
        }
      });

      if (!streamsResponse.ok) {
        throw new Error(
          `Streams request failed with status ${streamsResponse.status}`
        );
      }

      const { data } = (await streamsResponse.json()) as {
        data?: TwitchStream[];
      };

      return data ?? [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch Twitch streams: ${error?.message ?? error}`
      );
      return [];
    }
  }

  async getStreams(): Promise<PagedResponseDto<TwitchStreamDto>> {
    const cached = await this.valkey.get(TWITCH_STREAMS_CACHE_KEY);

    if (cached) {
      const streams: TwitchStream[] = JSON.parse(cached);
      return new PagedResponseDto(TwitchStreamDto, [streams, streams.length]);
    }

    const streams = await this.fetchStreamsFromTwitch();

    await this.valkey.set(
      TWITCH_STREAMS_CACHE_KEY,
      JSON.stringify(streams),
      'EX',
      TWITCH_STREAMS_CACHE_TTL
    );

    return new PagedResponseDto(TwitchStreamDto, [streams, streams.length]);
  }
}
