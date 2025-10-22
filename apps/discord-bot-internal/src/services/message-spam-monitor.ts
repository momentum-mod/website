import { Events, Message, TextChannel } from 'discord.js';
import { Service } from '../types/service';
import { config } from '../config';
import { logger } from '../logger';

type UserMessages = Array<{ id: string; channelId: string; timestamp: number }>;

export class MessageSpamMonitorService extends Service {
  private userMessages: Map<string, UserMessages> = new Map();
  private totalMessages = 0;

  private modChannel?: TextChannel;

  async init() {
    const modChannel = await this.client.channels.fetch(
      config.moderator_channel
    );

    if (!modChannel || !modChannel.isTextBased()) {
      throw new Error(
        `Moderator channel with ID ${config.moderator_channel} not found or is not text-based.`
      );
    }

    this.modChannel = modChannel as TextChannel;

    this.client.on(Events.MessageCreate, this.onMessageCreate.bind(this));
  }

  async onMessageCreate(message: Message) {
    if (message.author.bot || message.channel.isDMBased()) return;

    const now = Date.now();
    const userId = message.author.id;

    // Track messages
    let messages = this.userMessages.get(userId);
    if (!messages) {
      messages = [];
      this.userMessages.set(userId, messages);
    }

    messages.push({
      id: message.id,
      channelId: message.channel.id,
      timestamp: now
    });

    this.totalMessages++;

    // Prune every 1000 messages
    if (this.totalMessages % 1000 === 0) {
      for (const user of this.userMessages.keys()) {
        this.userMessages.set(
          user,
          this.userMessages
            .get(user)!
            .filter((m) => now - m.timestamp <= 60 * 1000)
        );
      }

      this.totalMessages = 0;
    }

    // Check for spam based on config values, i.e. messages in multiple channels
    const recent = messages.filter(
      (m) => now - m.timestamp <= config.spam_time_window_ms
    );
    const uniqueChannels = new Set(recent.map((m) => m.channelId));

    if (uniqueChannels.size >= config.spam_channel_limit) {
      for (const m of recent) {
        try {
          const channel = await this.client.channels.fetch(m.channelId);
          if (channel && channel.isTextBased()) {
            await (channel as TextChannel).messages.delete(m.id);
          }
        } catch (err) {
          logger.error(
            err,
            `Failed to delete spam message ${m.id} in channel ${m.channelId}`
          );
        }
      }

      // Timeout the offending user
      try {
        if (message.guild) {
          const member = await message.guild.members.fetch(userId);
          if (member) {
            const timeoutMs = config.spam_timeout_duration_minutes;
            await member.timeout(timeoutMs, 'Spam across multiple channels');
          }
        }
      } catch (err) {
        logger.error(err, 'Failed to timeout user');
      }

      // Ping mods in mod channel
      await this.modChannel!.send(
        `<@&${config.moderator_id}> User <@${userId}> spammed messages in ${config.spam_channel_limit} or more channels in ${config.spam_time_window_ms / 1000} seconds. All messages deleted. See <#${config.message_history_channel}> for deleted messages.`
      );

      // Clear user's messages
      messages.splice(0, messages.length);
    }
  }
}
