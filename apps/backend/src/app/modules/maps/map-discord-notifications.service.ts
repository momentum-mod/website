import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Leaderboard,
  MapCredit,
  MapInfo,
  MapReview,
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
  MapStatuses,
  GamemodeCategory,
  MapReviewSuggestion,
  TrackTypeName,
  mapTagEnglishName
} from '@momentum/constants';
import { APIEmbed, ChannelType } from 'discord.js';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';

@Injectable()
export class MapDiscordNotifications {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
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

    const reviewChannelID = this.config.getOrThrow('discord.reviewChannel');
    if (!reviewChannelID) return;

    // Cached in Discord.js
    const reviewChannel = await this.discord.channels.fetch(reviewChannelID);
    if (!reviewChannel || reviewChannel.type !== ChannelType.GuildForum) {
      this.logger.error(
        "Review channel doesn't exist or is not a guild forum channel."
      );
      return;
    }

    const info = this.getMapInfoForNotification(extendedMap);

    const mapEmbed = this.createMapEmbed(
      extendedMap,
      info.authors,
      info.leaderboards
    );

    const thread = await reviewChannel.threads.create({
      name: extendedMap.name,
      message: {
        content:
          ':warning: A new map is available for public testing! :warning:',
        embeds: [mapEmbed]
      }
    });

    await this.db.mapSubmission.update({
      where: { mapID: extendedMap.id },
      data: {
        discordReviewThread: thread.id
      }
    });

    const categories = this.getGamemodeCategories(
      info.rankedGamemodes,
      info.unrankedGamemodes
    );

    await this.broadcastToCategories(
      `:warning: A new map is available for public testing! :warning: Post feedback in ${thread.url}`,
      mapEmbed,
      categories.ranked
    );
    await this.broadcastToCategories(
      `:warning: A new **UNRANKED** map is available for public testing! :warning: Post feedback in ${thread.url}`,
      mapEmbed,
      categories.unranked
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

    const categories = this.getGamemodeCategories(
      info.rankedGamemodes,
      info.unrankedGamemodes
    );

    await this.broadcastToCategories(
      ':white_check_mark: A new map has been fully approved and added! :white_check_mark:',
      mapEmbed,
      categories.ranked
    );
    await this.broadcastToCategories(
      ':white_check_mark: A new **UNRANKED** map has been fully approved and added! :white_check_mark:',
      mapEmbed,
      categories.unranked
    );
  }

  async sendMapReviewToMapThread(review: ReviewWithInfo) {
    if (!this.discord.isEnabled()) return;

    const submission = await this.db.mapSubmission.findUnique({
      where: { mapID: review.mapID }
    });
    if (!submission || !submission.discordReviewThread) return;

    const reviewChannelID = this.config.getOrThrow('discord.reviewChannel');
    if (!reviewChannelID) return;

    // Cached in Discord.js
    const reviewChannel = await this.discord.channels.fetch(reviewChannelID);
    if (!reviewChannel || reviewChannel.type !== ChannelType.GuildForum) {
      this.logger.error(
        "Review channel doesn't exist or is not a guild forum channel."
      );
      return;
    }

    const thread = await this.discord.channels.fetch(
      submission.discordReviewThread
    );

    if (!thread || !thread.isThread()) {
      this.logger.error(
        'Could not find a review thread for a map with id ' + review.mapID
      );
      return;
    }

    const reviewEmbed = this.createReviewEmbed(review);
    try {
      await thread.send({
        embeds: [reviewEmbed]
      });
    } catch (error) {
      this.logger.error('Failed to send a review to discord thread', error);
    }
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

  createReviewEmbed(review: ReviewWithInfo) {
    const frontendUrl = this.config.getOrThrow('url.frontend');

    const embed = {
      title: 'A new review was posted',
      description: review.mainText,
      url: `${frontendUrl}/maps/${review.mmap.name}`,
      timestamp: review.createdAt.toISOString(),
      color: 1611475,
      author: {
        icon_url: steamAvatarUrl(review.reviewer.avatar),
        name: review.reviewer.alias
      }
    };

    if (review.resolved !== null) {
      embed['footer'] = {
        text: 'This review requires resolving'
      };
    }

    const suggestions = review.suggestions as unknown as MapReviewSuggestion[]; // TODO: #855
    if (suggestions.length > 0) {
      let suggestionsText = suggestions
        .map((sugg) => {
          const title = `${GamemodeInfo.get(sugg.gamemode).name} - ${TrackTypeName.get(sugg.trackType)}`;
          const tier = sugg.tier ? 'Tier ' + sugg.tier : null;
          const rating = sugg.gameplayRating
            ? 'Rating ' + sugg.gameplayRating
            : null;
          const tags =
            sugg.tags && sugg.tags.length > 0
              ? 'Tags ' + sugg.tags?.map(mapTagEnglishName)?.join(', ')
              : null;
          return `${title}: ${[tier, rating, tags].filter(Boolean).join('; ')}`;
        })
        .slice(0, 10)
        .join('\n');
      if (suggestions.length > 10) suggestionsText += '\n...';

      embed['fields'] = [
        {
          name: 'Suggestions',
          value: suggestionsText
        }
      ];
    }

    return embed;
  }

  private async broadcastToCategories(
    text: string,
    embed: APIEmbed,
    categories: Array<GamemodeCategory>
  ): Promise<void> {
    await Promise.all(
      categories.map(async (category) => {
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

  private getGamemodeCategories(
    rankedGamemodes: Gamemode[],
    unrankedGamemodes: Gamemode[]
  ): {
    ranked: GamemodeCategory[];
    unranked: GamemodeCategory[];
  } {
    const ranked = GamemodeCategories.entries()
      .toArray()
      .filter(([, modes]) => modes.some((gm) => rankedGamemodes.includes(gm)))
      .map(([cat]) => cat);

    const unranked = GamemodeCategories.entries()
      .toArray()
      .filter(([, modes]) => modes.some((gm) => unrankedGamemodes.includes(gm)))
      .map(([cat]) => cat)
      .filter((cat) => !ranked.includes(cat));

    return { ranked, unranked };
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

export interface ReviewWithInfo extends MapReview {
  mmap: MMap;
  reviewer: User;
}
