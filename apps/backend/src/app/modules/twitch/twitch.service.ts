import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { lastValueFrom } from 'rxjs';
import * as Sentry from '@sentry/node';
import { ValkeyService } from '../valkey/valkey.service';
import { isFirstWorker } from '../../../clustered';
import { PagedResponseDto, TwitchStreamDto } from '../../dto';
import { TwitchStream } from '@momentum/constants';

export const TWITCH_STREAMS_CACHE_KEY = 'twitch:streams';
export const TWITCH_STREAMS_UPDATE_JOB_NAME = 'TwitchStreamsUpdateJob';
export const MOMENTUM_MOD_GAME_ID = '2043449207';

@Injectable()
export class TwitchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Twitch Service');

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly valkey: ValkeyService
  ) {}

  async onModuleInit(): Promise<void> {
    if (!isFirstWorker()) return;

    const clientId = this.config.get<string>('twitch.clientId');
    const clientSecret = this.config.get<string>('twitch.clientSecret');

    if (!clientId || !clientSecret) {
      this.logger.warn(
        'Twitch client credentials not configured; streams update job will not run.'
      );
      return;
    }
    const cached = await this.valkey.get(TWITCH_STREAMS_CACHE_KEY);
    if (!cached) {
      await this.updateStreams();
    }

    const schedule =
      this.config.get<string>('twitch.streamsUpdateSchedule') ?? '*/5 * * * *';

    this.schedulerRegistry.addCronJob(
      TWITCH_STREAMS_UPDATE_JOB_NAME,
      CronJob.from({
        cronTime: schedule,
        onTick: this.updateStreams.bind(this),
        waitForCompletion: true,
        start: true,
        errorHandler: (error) => {
          if (Sentry.isInitialized()) {
            Sentry.setContext('Error', { error });
            Sentry.getCurrentScope().setLevel('warning');
            Sentry.captureException('Failed to update Twitch streams');
          }
        }
      })
    );

    this.logger.log(
      `Twitch streams update job scheduled with cron: ${schedule}`
    );
  }

  onModuleDestroy(): void {
    if (
      this.schedulerRegistry.doesExist('cron', TWITCH_STREAMS_UPDATE_JOB_NAME)
    ) {
      this.schedulerRegistry.deleteCronJob(TWITCH_STREAMS_UPDATE_JOB_NAME);
    }
  }

  async updateStreams(): Promise<void> {
    const clientId = this.config.get<string>('twitch.clientId');
    const clientSecret = this.config.get<string>('twitch.clientSecret');

    if (!clientId || !clientSecret) return;

    try {
      const tokenResponse = await lastValueFrom(
        this.http.post<{ access_token: string }>(
          'https://id.twitch.tv/oauth2/token',
          null,
          {
            params: {
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'client_credentials'
            }
          }
        )
      );

      const token = tokenResponse.data?.access_token;
      if (!token) {
        throw new Error('OAuth response did not return an access_token');
      }
      const streamsResponse = await lastValueFrom(
        this.http.get<{ data: TwitchStream[] }>(
          'https://api.twitch.tv/helix/streams',
          {
            params: { game_id: MOMENTUM_MOD_GAME_ID },
            headers: {
              'Client-ID': clientId,
              Authorization: `Bearer ${token}`
            }
          }
        )
      );

      const streams = streamsResponse.data?.data ?? [];
      await this.valkey.set(TWITCH_STREAMS_CACHE_KEY, JSON.stringify(streams));
      this.logger.log(
        `Updated Twitch streams: ${streams.length} live stream(s) found`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update Twitch streams: ${error?.message ?? error}`
      );
      if (Sentry.isInitialized()) {
        Sentry.setContext('Twitch Update Error', { error });
        Sentry.captureException(error);
      }
    }
  }

  async getStreams(): Promise<PagedResponseDto<TwitchStreamDto>> {
    const cached = await this.valkey.get(TWITCH_STREAMS_CACHE_KEY);

    if (cached) {
      try {
        const streams: TwitchStream[] = JSON.parse(cached);
        return new PagedResponseDto(TwitchStreamDto, [streams, streams.length]);
      } catch (e) {
        this.logger.error(
          `Error parsing cached Twitch streams: ${e?.message ?? e}`
        );
      }
    }

    const clientId = this.config.get<string>('twitch.clientId');
    const clientSecret = this.config.get<string>('twitch.clientSecret');

    if (clientId && clientSecret) {
      await this.updateStreams();
      const fresh = await this.valkey.get(TWITCH_STREAMS_CACHE_KEY);
      if (fresh) {
        try {
          const streams: TwitchStream[] = JSON.parse(fresh);
          return new PagedResponseDto(TwitchStreamDto, [
            streams,
            streams.length
          ]);
        } catch {}
      }
    }

    return new PagedResponseDto(TwitchStreamDto, [[], 0]);
  }
}
