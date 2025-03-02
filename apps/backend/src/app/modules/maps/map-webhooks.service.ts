import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Leaderboard,
  MapCredit,
  MapInfo,
  MapSubmission,
  MMap,
  User
} from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import {
  MapSubmissionSuggestion,
  GamemodeCategories,
  GamemodeInfo,
  TrackType,
  imgLargePath,
  MapCreditType,
  MapSubmissionPlaceholder,
  LeaderboardType,
  Gamemode,
  steamAvatarUrl
} from '@momentum/constants';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MapWebhooksService {
  constructor(
    private config: ConfigService,
    private http: HttpService
  ) {}

  private readonly logger = new Logger('Discord Webhooks');

  async sendPublicTestingDiscordEmbed(
    extendedMap: MMap & {
      info: MapInfo;
      submission: MapSubmission;
      submitter: User;
      credits: Array<MapCredit & { user: User }>;
    }
  ) {
    const suggestions =
      (extendedMap.submission
        .suggestions as unknown as MapSubmissionSuggestion[]) ?? []; // TODO: #855

    const placeholders =
      (extendedMap.submission
        .placeholders as unknown as MapSubmissionPlaceholder[]) ?? []; // TODO: #855

    const mainTrackSuggestions = suggestions.filter(
      ({ trackType }) => trackType === TrackType.MAIN
    );

    const mainTrackGamemodes = new Set(
      mainTrackSuggestions.map(({ gamemode }) => gamemode)
    );

    const mapAuthors = [
      ...placeholders
        .filter(({ type }) => type === MapCreditType.AUTHOR)
        .map(({ alias }) => alias),
      ...extendedMap.credits
        .filter(({ type }) => type === MapCreditType.AUTHOR)
        .map(({ user }) => user.alias)
    ].sort();

    const webhookBody = this.createMapUpdateWebhookBody(
      'A new map is open for public testing!',
      extendedMap,
      mapAuthors,
      mainTrackSuggestions
    );

    await this.broadcastWebhookToCategories(mainTrackGamemodes, webhookBody);
  }

  async sendApprovedDiscordEmbed(
    extendedMap: MMap & {
      info: MapInfo;
      leaderboards: Array<Leaderboard>;
      submitter: User;
      credits: Array<MapCredit & { user: User }>;
    }
  ) {
    const mainTrackLeaderboards = extendedMap.leaderboards.filter(
      ({ trackType, type }) =>
        trackType === TrackType.MAIN && type !== LeaderboardType.HIDDEN
    );

    const mainTrackGamemodes = new Set(
      mainTrackLeaderboards.map(({ gamemode }) => gamemode)
    );

    const mapAuthors = extendedMap.credits
      .filter(({ type }) => type === MapCreditType.AUTHOR)
      .map(({ user }) => user.alias)
      .sort();

    const webhookBody = this.createMapUpdateWebhookBody(
      'A new map has been added!',
      extendedMap,
      mapAuthors,
      mainTrackLeaderboards
    );

    await this.broadcastWebhookToCategories(mainTrackGamemodes, webhookBody);
  }

  createMapUpdateWebhookBody(
    text: string,
    extendedMap: MMap & { info: MapInfo; submitter: User },
    authors: Array<string>,
    gamemodes: MapSubmissionSuggestion[] | Leaderboard[]
  ) {
    const frontendUrl = this.config.getOrThrow('url.frontend');
    const cdnUrl = this.config.getOrThrow('url.cdn');

    return {
      content: text,
      embeds: [
        {
          title: extendedMap.name,
          description: 'By ' + authors.map((a) => `**${a}**`).join(', '),
          url: `${frontendUrl}/maps/${extendedMap.name}`,
          timestamp: extendedMap.info.creationDate.toISOString(),
          color: 1611475,
          image: {
            url: `${cdnUrl}/${imgLargePath(extendedMap.images[0])}`
          },
          fields: gamemodes.map(
            (gm: MapSubmissionSuggestion | Leaderboard) => ({
              name: GamemodeInfo.get(gm.gamemode).name,
              value: `Tier ${gm.tier}${gm.type === LeaderboardType.UNRANKED ? ' (Unranked)' : ''}`,
              inline: true
            })
          ),
          footer: {
            icon_url: steamAvatarUrl(extendedMap.submitter.avatar),
            text: extendedMap.submitter.alias
          }
        }
      ]
    };
  }

  async broadcastWebhookToCategories(
    gamemodes: Set<Gamemode>,
    webhookBody: object
  ): Promise<void> {
    await Promise.all(
      GamemodeCategories.entries()
        .filter(([, modes]) => modes.some((gm) => gamemodes.has(gm)))
        .map(([category]) => {
          const webhookUrl = this.config.getOrThrow(
            `discordWebhooks.${category}`
          );
          if (webhookUrl === '') return;

          return firstValueFrom(
            this.http.post(webhookUrl, webhookBody, {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        })
    ).catch((error) => this.logger.error('Failed to post to webhook', error));
  }
}
