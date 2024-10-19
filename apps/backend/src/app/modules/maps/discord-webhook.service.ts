import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Leaderboard, MapInfo, MMap, User } from '@prisma/client';
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
  Gamemode
} from '@momentum/constants';
import { ExtendedTransactionClient } from '@momentum/db';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DiscordWebhookService {
  constructor(
    private config: ConfigService,
    private http: HttpService
  ) {}

  private readonly logger = new Logger('Discord Webhooks');

  async sendMapPublicTestingEmbed(tx: ExtendedTransactionClient, map: MMap) {
    const extendedMap = await tx.mMap.findUnique({
      where: { id: map.id },
      include: {
        info: true,
        submission: true,
        submitter: true,
        credits: { include: { user: true } }
      }
    });

    const suggestions =
      (extendedMap.submission
        .suggestions as unknown as MapSubmissionSuggestion[]) ?? []; // TODO: #855

    const placeholders =
      (extendedMap.submission
        .placeholders as unknown as MapSubmissionPlaceholder[]) ?? []; // TODO: #855

    const mainTrackSuggestions = suggestions.filter(
      (sugg) => sugg.trackType === TrackType.MAIN
    );

    const mainTrackGamemodes = new Set(
      mainTrackSuggestions.map((sugg) => sugg.gamemode)
    );

    const mapAuthors = [
      ...placeholders
        .filter((cred) => cred.type === MapCreditType.AUTHOR)
        .map((p) => p.alias),
      ...extendedMap.credits
        .filter((cred) => cred.type === MapCreditType.AUTHOR)
        .map((s) => s.user.alias)
    ].sort();

    const webhookBody = this.createWebhookBody(
      'New map is open for public testing!',
      extendedMap,
      mapAuthors,
      mainTrackSuggestions
    );

    await this.broadcastWebhookToCategories(mainTrackGamemodes, webhookBody);
  }

  async sendMapApprovedEmbed(tx: ExtendedTransactionClient, map: MMap) {
    const extendedMap = await tx.mMap.findUnique({
      where: { id: map.id },
      include: {
        info: true,
        leaderboards: true,
        submitter: true,
        credits: { include: { user: true } }
      }
    });

    const mainTrackLeaderboards = extendedMap.leaderboards.filter(
      (lb) =>
        lb.trackType === TrackType.MAIN && lb.type !== LeaderboardType.HIDDEN
    );

    const mainTrackGamemodes = new Set(
      mainTrackLeaderboards.map((sugg) => sugg.gamemode)
    );

    const mapAuthors = extendedMap.credits
      .filter((cred) => cred.type === MapCreditType.AUTHOR)
      .map((s) => s.user.alias)
      .sort();

    const webhookBody = this.createWebhookBody(
      'New map has been approved!',
      extendedMap,
      mapAuthors,
      mainTrackLeaderboards
    );

    await this.broadcastWebhookToCategories(mainTrackGamemodes, webhookBody);
  }

  createWebhookBody(
    text: string,
    extendedMap: MMap & { info: MapInfo; submitter: User },
    authors: Array<string>,
    gamemodes: MapSubmissionSuggestion[] | Leaderboard[]
  ) {
    const FRONTEND_URL = this.config.getOrThrow('url.frontend');
    const CDN_URL = this.config.getOrThrow('url.cdn');

    return {
      content: text,
      embeds: [
        {
          title: extendedMap.name,
          description: 'By ' + authors.map((a) => `**${a}**`).join(', '),
          url: `${FRONTEND_URL}/maps/${extendedMap.id}`,
          timestamp: extendedMap.info.creationDate.toISOString(),
          color: 1611475,
          image: {
            url: `${CDN_URL}/${imgLargePath(extendedMap.images[0])}`
          },
          fields: gamemodes.map(
            (gm: MapSubmissionSuggestion | Leaderboard) => ({
              name: GamemodeInfo.get(gm.gamemode).name,
              value: `Tier ${gm.tier}${gm.type === LeaderboardType.UNRANKED ? ' (Unranked)' : ''}`,
              inline: true
            })
          ),
          footer: {
            icon_url: `https://avatars.cloudflare.steamstatic.com/${extendedMap.submitter.avatar}.jpg`,
            text: extendedMap.submitter.alias
          }
        }
      ]
    };
  }

  async broadcastWebhookToCategories(
    gamemodes: Set<Gamemode>,
    webhookBody: object
  ) {
    for (const [category, modes] of GamemodeCategories.entries()) {
      if (modes.some((gm) => gamemodes.has(gm))) {
        const webhookUrl = this.config.getOrThrow(
          `discordWebhooks.${category}`
        );

        if (webhookUrl === '') continue;

        const responseOrStatus = await this.postWebhook(
          webhookUrl,
          webhookBody
        );

        if (!responseOrStatus) break;
      }
    }
  }

  async postWebhook(webhookUrl: string, body: object) {
    return await firstValueFrom(
      this.http.post(webhookUrl, body, {
        headers: { 'Content-Type': 'application/json' }
      })
    ).catch((error) => {
      this.logger.error(
        'Failed to post to webhook',
        error.response ? JSON.stringify(error.response.data, null, 2) : error
      );
      return false;
    });
  }
}
