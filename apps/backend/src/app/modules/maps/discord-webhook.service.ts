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
  LeaderboardType
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

    const suggestions = extendedMap.submission
      .suggestions as unknown as MapSubmissionSuggestion[]; // TODO: #855

    const placeholders = extendedMap.submission
      .placeholders as unknown as MapSubmissionPlaceholder[]; // TODO: #855

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

    for (const categoryEntry of GamemodeCategories.entries()) {
      if (categoryEntry[1].some((gm) => mainTrackGamemodes.has(gm))) {
        const webhookUrl = this.config.getOrThrow(
          `discordWebhooks.${categoryEntry[0]}`
        );

        if (!webhookUrl) continue;

        const responseOrStatus = this.postWebhook(
          webhookUrl,
          extendedMap,
          mapAuthors,
          mainTrackSuggestions
        );

        if (!responseOrStatus) break;
      }
    }
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

    for (const categoryEntry of GamemodeCategories.entries()) {
      if (categoryEntry[1].some((gm) => mainTrackGamemodes.has(gm))) {
        const webhookUrl = this.config.getOrThrow(
          `discordWebhooks.${categoryEntry[0]}`
        );

        if (!webhookUrl) continue;

        const responseOrStatus = this.postWebhook(
          webhookUrl,
          extendedMap,
          mapAuthors,
          mainTrackLeaderboards
        );

        if (!responseOrStatus) break;
      }
    }
  }

  async postWebhook(
    webhookUrl: string,
    extendedMap: MMap & { info: MapInfo; submitter: User },
    authors: Array<string>,
    gamemodes: MapSubmissionSuggestion[] | Leaderboard[]
  ) {
    const FRONTEND_URL = this.config.getOrThrow('url.frontend');
    const CDN_URL = this.config.getOrThrow('url.cdn');

    return await firstValueFrom(
      this.http.post(
        webhookUrl,
        {
          content: 'New map has been approved!',
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
              fields: gamemodes.map((gm) => ({
                name: GamemodeInfo.get(gm.gamemode).name,
                value: `Tier ${gm.tier} ${gm.type === LeaderboardType.UNRANKED ? '(Unranked)' : ''}`,
                inline: true
              })),
              footer: {
                icon_url: `https://avatars.cloudflare.steamstatic.com/${extendedMap.submitter.avatar}.jpg`,
                text: extendedMap.submitter.alias
              }
            }
          ]
        },
        { headers: { 'Content-Type': 'application/json' } }
      )
    ).catch((error) => {
      this.logger.error(
        'Failed to post to webhook: ' +
          (error.response
            ? JSON.stringify(error.response.data, null, 2)
            : error)
      );
      return false;
    });
  }
}
