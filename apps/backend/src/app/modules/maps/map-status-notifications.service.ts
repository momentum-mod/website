import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Leaderboard,
  MapCredit,
  MapInfo,
  MapSubmission,
  MMap,
  User
} from '@momentum/db';
import { DiscordService } from '../discord/discord.service';
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
  steamAvatarUrl,
  MapStatuses
} from '@momentum/constants';
import { APIEmbed } from 'discord.js';

@Injectable()
export class MapStatusNotifications {
  constructor(
    private config: ConfigService,
    private discord: DiscordService
  ) {}

  private readonly logger = new Logger('Discord Notifications');

  async sendMapContentApprovalNotification(
    extendedMap: MapWithInfoInSubmission
  ) {
    if (!this.discord.isEnabled()) return;

    const contentApprovalChannelID = this.config.getOrThrow(
      'discord.contentApprovalChannel'
    );
    if (!contentApprovalChannelID) return;

    // Cached in Discord.js
    const contentApprovalChannel = await this.discord.channels.fetch(
      contentApprovalChannelID
    );
    if (!contentApprovalChannel || !contentApprovalChannel.isSendable()) {
      this.logger.error(
        "Content approval channel doesn't exist or is not sendable."
      );
      return;
    }

    const info = this.getMapInfoForNotification(extendedMap);

    const mapEmbed = this.createMapEmbed(
      extendedMap,
      info.authors,
      info.leaderboards
    );

    try {
      await contentApprovalChannel.send({
        content: ':tools: A new map is available for content approval :tools:',
        embeds: [mapEmbed]
      });
    } catch (error) {
      this.logger.error('Failed to send discord notification', error);
    }
  }

  async sendPublicTestingNotification(extendedMap: MapWithInfoInSubmission) {
    if (!this.discord.isEnabled()) return;

    const portingChannelID = this.config.getOrThrow('discord.portingChannel');
    if (!portingChannelID) return;

    // Cached in Discord.js
    const portingChannel = await this.discord.channels.fetch(portingChannelID);
    if (!portingChannel || !portingChannel.isSendable()) {
      this.logger.error("Porting channel doesn't exist or is not sendable.");
      return;
    }

    const info = this.getMapInfoForNotification(extendedMap);

    const mapEmbed = this.createMapEmbed(
      extendedMap,
      info.authors,
      info.leaderboards
    );

    const message = await portingChannel.send({
      content: ':warning: A new map is available for public testing! :warning:',
      embeds: [mapEmbed]
    });
    const thread = await message.startThread({ name: extendedMap.name });

    await this.broadcastToCategories(
      `:warning: A new map is available for public testing! :warning: ${thread.url}`,
      mapEmbed,
      info.rankedGamemodes
    );
    await this.broadcastToCategories(
      `:warning: A new **UNRANKED** map is available for public testing! :warning: ${thread.url}`,
      mapEmbed,
      info.unrankedGamemodes
    );
  }

  async sendApprovedNotification(extendedMap: MapWithInfoApproved) {
    if (!this.discord.isEnabled()) return;

    const info = this.getMapInfoForNotification(extendedMap);

    const mapEmbed = this.createMapEmbed(
      extendedMap,
      info.authors,
      info.leaderboards
    );

    await this.broadcastToCategories(
      ':white_check_mark: A new map has been fully approved and added! :white_check_mark:',
      mapEmbed,
      info.rankedGamemodes
    );
    await this.broadcastToCategories(
      ':white_check_mark: A new **UNRANKED** map has been fully approved and added! :white_check_mark:',
      mapEmbed,
      info.unrankedGamemodes
    );
  }

  createMapEmbed(
    extendedMap: MMap & { info: MapInfo; submitter: User },
    authors: Array<string>,
    gamemodes: MapSubmissionSuggestion[] | Leaderboard[]
  ) {
    const frontendUrl = this.config.getOrThrow('url.frontend');
    const cdnUrl = this.config.getOrThrow('url.cdn');

    return {
      title: extendedMap.name,
      description: 'By ' + authors.map((a) => `**${a}**`).join(', '),
      url: `${frontendUrl}/maps/${extendedMap.name}`,
      timestamp: extendedMap.info.creationDate.toISOString(),
      color: 1611475,
      image: {
        url: `${cdnUrl}/${imgLargePath(extendedMap.images[0])}`
      },
      fields: gamemodes.map((gm: MapSubmissionSuggestion | Leaderboard) => ({
        name: GamemodeInfo.get(gm.gamemode).name,
        value: `Tier ${gm.tier}${gm.type === LeaderboardType.UNRANKED ? ' (Unranked)' : ''}`,
        inline: true
      })),
      footer: {
        icon_url: steamAvatarUrl(extendedMap.submitter.avatar),
        text: extendedMap.submitter.alias
      }
    };
  }

  private async broadcastToCategories(
    text: string,
    embed: APIEmbed,
    gamemodes: Array<Gamemode>
  ): Promise<void> {
    await Promise.all(
      GamemodeCategories.entries()
        .filter(([, modes]) => modes.some((gm) => gamemodes.includes(gm)))
        .map(async ([category]) => {
          if (!this.discord.isEnabled()) return;

          const channelID = this.config.getOrThrow(
            `discord.statusChannels.${category}`
          );
          if (channelID === '') return;

          // Cached in Discord.js
          const channel = await this.discord.channels.fetch(channelID);
          if (!channel || !channel.isSendable())
            throw new Error(
              "Channel specified doesn't exist or is not sendable."
            );

          return channel.send({ content: text, embeds: [embed] });
        })
    ).catch((error) =>
      this.logger.error('Failed to send discord notification', error)
    );
  }

  private getMapInfoForNotification(
    extendedMap: MapWithInfo &
      Partial<MapWithInfoInSubmission> &
      Partial<MapWithInfoApproved>
  ): {
    authors: Array<string>;
    leaderboards: MapSubmissionSuggestion[] | Leaderboard[];
    rankedGamemodes: Gamemode[];
    unrankedGamemodes: Gamemode[];
  } {
    const authors = extendedMap.credits
      .filter(({ type }) => type === MapCreditType.AUTHOR)
      .map(({ user }) => user.alias);

    let leaderboards: MapSubmissionSuggestion[] | Leaderboard[] =
      extendedMap.leaderboards?.filter(
        ({ trackType, type }) =>
          trackType === TrackType.MAIN && type !== LeaderboardType.HIDDEN
      );

    if (MapStatuses.IN_SUBMISSION.includes(extendedMap.status)) {
      const suggestions =
        (extendedMap.submission
          .suggestions as unknown as MapSubmissionSuggestion[]) ?? []; // TODO: #855

      leaderboards = suggestions.filter(
        ({ trackType }) => trackType === TrackType.MAIN
      );

      const placeholders =
        (extendedMap.submission
          .placeholders as unknown as MapSubmissionPlaceholder[]) ?? []; // TODO: #855

      authors.push(
        ...placeholders
          .filter(({ type }) => type === MapCreditType.AUTHOR)
          .map(({ alias }) => alias)
      );
    }

    return {
      authors: authors.sort(),
      leaderboards,
      rankedGamemodes: leaderboards
        .filter(({ type }) => type === LeaderboardType.RANKED)
        .map(({ gamemode }) => gamemode),
      unrankedGamemodes: leaderboards
        .filter(({ type }) => type === LeaderboardType.UNRANKED)
        .map(({ gamemode }) => gamemode)
    };
  }
}

export interface MapWithInfo extends MMap {
  info: MapInfo;
  submitter: User;
  credits: Array<MapCredit & { user: User }>;
}
export interface MapWithInfoInSubmission extends MapWithInfo {
  submission: MapSubmission;
}

export interface MapWithInfoApproved extends MapWithInfo {
  leaderboards: Array<Leaderboard>;
}
