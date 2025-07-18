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
  steamAvatarUrl
} from '@momentum/constants';
import { APIEmbed } from 'discord.js';

@Injectable()
export class MapWebhooksService {
  constructor(
    private config: ConfigService,
    private discord: DiscordService
  ) {}

  private readonly logger = new Logger('Discord Notifications');

  async sendMapAddedNotificaiton(
    extendedMap: MMap & {
      info: MapInfo;
      submission: MapSubmission;
      submitter: User;
      credits: Array<MapCredit & { user: User }>;
    }
  ) {
    if (!this.discord.enabled) return;

    // TODO: Remove all that (no?). For content approvals send to a different
    // channel just with a notification for a map to be approved.

    const contentApprovalChannelID = this.config.getOrThrow(
      'discord.contentApprovalChannel'
    );
    if (!contentApprovalChannelID) return;

    const contentApprovalChannel = await this.discord.channels.fetch(
      contentApprovalChannelID
    );
    if (!contentApprovalChannel || !contentApprovalChannel.isSendable()) {
      this.logger.error(
        "Content approval channel doesn't exist or is not sendable."
      );
      return;
    }

    // TODO: Move all that to seperate functions, one for approved map and one for in-submission ones
    const suggestions =
      (extendedMap.submission
        .suggestions as unknown as MapSubmissionSuggestion[]) ?? []; // TODO: #855

    const placeholders =
      (extendedMap.submission
        .placeholders as unknown as MapSubmissionPlaceholder[]) ?? []; // TODO: #855

    const mainTrackSuggestions = suggestions.filter(
      ({ trackType }) => trackType === TrackType.MAIN
    );

    const mapAuthors = [
      ...placeholders
        .filter(({ type }) => type === MapCreditType.AUTHOR)
        .map(({ alias }) => alias),
      ...extendedMap.credits
        .filter(({ type }) => type === MapCreditType.AUTHOR)
        .map(({ user }) => user.alias)
    ].sort();

    const mapEmbed = this.createMapEmbed(
      extendedMap,
      mapAuthors,
      mainTrackSuggestions
    );

    try {
      await contentApprovalChannel.send({
        content: ':tools: A new map is available for content approval :tools:',
        embeds: [mapEmbed]
      });
      // TODO: Do this for the public testing instead
      // await message.startThread({ name: extendedMap.name });
    } catch (error) {
      this.logger.error('Failed to send discord notification', error);
    }
  }

  async sendPublicTestingNotification(
    extendedMap: MMap & {
      info: MapInfo;
      submission: MapSubmission;
      submitter: User;
      credits: Array<MapCredit & { user: User }>;
    }
  ) {
    if (!this.discord.enabled) return;

    // TODO: Send a message with a thread about new map in porting channel
    // then send a link to this thread in category channels

    const suggestions =
      (extendedMap.submission
        .suggestions as unknown as MapSubmissionSuggestion[]) ?? []; // TODO: #855

    const placeholders =
      (extendedMap.submission
        .placeholders as unknown as MapSubmissionPlaceholder[]) ?? []; // TODO: #855

    const mainTrackSuggestions = suggestions.filter(
      ({ trackType }) => trackType === TrackType.MAIN
    );

    const mainTrackRankedGamemodes = mainTrackSuggestions
      .filter(({ type }) => type === LeaderboardType.RANKED)
      .map(({ gamemode }) => gamemode);

    const mainTrackUnrankedGamemodes = mainTrackSuggestions
      .filter(({ type }) => type === LeaderboardType.UNRANKED)
      .map(({ gamemode }) => gamemode);

    const mapAuthors = [
      ...placeholders
        .filter(({ type }) => type === MapCreditType.AUTHOR)
        .map(({ alias }) => alias),
      ...extendedMap.credits
        .filter(({ type }) => type === MapCreditType.AUTHOR)
        .map(({ user }) => user.alias)
    ].sort();

    const mapEmbed = this.createMapEmbed(
      extendedMap,
      mapAuthors,
      mainTrackSuggestions
    );

    await this.broadcastToCategories(
      ':warning: A new map is available for public testing! :warning:',
      mapEmbed,
      mainTrackRankedGamemodes
    );
    await this.broadcastToCategories(
      ':warning: A new **UNRANKED** map is available for public testing! :warning:',
      mapEmbed,
      mainTrackUnrankedGamemodes
    );
  }

  async sendApprovedNotification(
    extendedMap: MMap & {
      info: MapInfo;
      leaderboards: Array<Leaderboard>;
      submitter: User;
      credits: Array<MapCredit & { user: User }>;
    }
  ) {
    if (!this.discord.enabled) return;

    const mainTrackLeaderboards = extendedMap.leaderboards.filter(
      ({ trackType, type }) =>
        trackType === TrackType.MAIN && type !== LeaderboardType.HIDDEN
    );

    const mainTrackRankedGamemodes = mainTrackLeaderboards
      .filter(({ type }) => type === LeaderboardType.RANKED)
      .map(({ gamemode }) => gamemode);

    const mainTrackUnrankedGamemodes = mainTrackLeaderboards
      .filter(({ type }) => type === LeaderboardType.UNRANKED)
      .map(({ gamemode }) => gamemode);

    const mapAuthors = extendedMap.credits
      .filter(({ type }) => type === MapCreditType.AUTHOR)
      .map(({ user }) => user.alias)
      .sort();

    const mapEmbed = this.createMapEmbed(
      extendedMap,
      mapAuthors,
      mainTrackLeaderboards
    );

    await this.broadcastToCategories(
      ':white_check_mark: A new map has been fully approved and added! :white_check_mark:',
      mapEmbed,
      mainTrackRankedGamemodes
    );
    await this.broadcastToCategories(
      ':white_check_mark: A new **UNRANKED** map has been fully approved and added! :white_check_mark:',
      mapEmbed,
      mainTrackUnrankedGamemodes
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

  async broadcastToCategories(
    text: string,
    embed: APIEmbed,
    gamemodes: Array<Gamemode>
  ): Promise<void> {
    await Promise.all(
      GamemodeCategories.entries()
        .filter(([, modes]) => modes.some((gm) => gamemodes.includes(gm)))
        .map(async ([category]) => {
          const channelID = this.config.getOrThrow(
            `discord.statusChannels.${category}`
          );
          if (channelID === '') return;

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
}
