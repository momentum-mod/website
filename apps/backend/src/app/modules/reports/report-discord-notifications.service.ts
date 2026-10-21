import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Report } from '@momentum/db';
import {
  ReportCategory,
  ReportType,
  steamAvatarUrl
} from '@momentum/constants';
import { APIEmbed, escapeMarkdown, WebhookClient } from 'discord.js';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';

const ReportTypeText: Record<ReportType, string> = {
  [ReportType.USER_PROFILE_REPORT]: 'User Profile Report',
  [ReportType.MAP_REPORT]: 'Map Report',
  [ReportType.MAP_COMMENT_REPORT]: 'Map Comment Report',
  [ReportType.PLAYER_REPORT]: 'Player Report'
};

const ReportCategoryText: Record<ReportCategory, string> = {
  [ReportCategory.OTHER]: 'Other',
  [ReportCategory.INAPPROPRIATE_CONTENT]: 'Inappropriate Content',
  [ReportCategory.PLAGIARISM]: 'Plagiarism',
  [ReportCategory.SPAM]: 'Spam'
};

@Injectable()
export class ReportDiscordNotifications {
  private readonly logger = new Logger('Discord Notifications');
  private readonly webhook: WebhookClient | null = null;

  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly config: ConfigService
  ) {
    const url = this.config.getOrThrow('discord.reportsWebhook');
    if (!url) return;

    try {
      this.webhook = new WebhookClient({ url });
    } catch (error) {
      this.logger.error(
        'DISCORD_REPORTS_WEBHOOK is not a valid webhook URL, report notifications will be disabled.',
        error
      );
    }
  }

  async sendReportNotification(report: Report) {
    if (!this.webhook) return;

    try {
      await this.webhook.send({
        embeds: [await this.createReportEmbed(report)],
        // Report messages are user-written, never let them ping anyone.
        allowedMentions: { parse: [] }
      });
    } catch (error) {
      this.logger.error('Failed to send report notification', error);
    }
  }

  private async createReportEmbed(report: Report): Promise<APIEmbed> {
    const frontendUrl = this.config.getOrThrow('url.frontend');

    const submitter = report.submitterID
      ? await this.db.user.findUnique({ where: { id: report.submitterID } })
      : null;

    const embed: APIEmbed = {
      title: `New ${ReportTypeText[report.type as ReportType] ?? 'Report'}`,
      description: report.message || '*No message*',
      url: `${frontendUrl}/admin/reports`,
      timestamp: report.createdAt.toISOString(),
      color: 0xe74c3c,
      fields: [
        {
          name: 'Category',
          value:
            ReportCategoryText[report.category as ReportCategory] ?? 'Unknown',
          inline: true
        },
        {
          name: 'Reported',
          value: await this.getTargetText(report),
          inline: true
        }
      ],
      footer: { text: `Report #${report.id}` }
    };

    if (submitter) {
      embed.author = {
        name: submitter.alias,
        icon_url: steamAvatarUrl(submitter.avatar),
        url: `${frontendUrl}/profile/${submitter.id}`
      };
    }

    return embed;
  }

  // `data` points into a different table depending on `type`.
  private async getTargetText(report: Report): Promise<string> {
    const frontendUrl = this.config.getOrThrow('url.frontend');
    const id = Number(report.data);

    switch (report.type) {
      case ReportType.USER_PROFILE_REPORT:
      case ReportType.PLAYER_REPORT: {
        const user = await this.db.user.findUnique({ where: { id } });
        return user
          ? `[${escapeMarkdown(user.alias)}](${frontendUrl}/profile/${id})`
          : `Unknown user (ID ${id})`;
      }
      case ReportType.MAP_REPORT: {
        const map = await this.db.mMap.findUnique({ where: { id } });
        return map
          ? `[${escapeMarkdown(map.name)}](${frontendUrl}/maps/${map.name})`
          : `Unknown map (ID ${id})`;
      }
      default:
        return `ID ${id}`;
    }
  }
}
