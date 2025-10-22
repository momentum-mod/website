import { Events, Message, TextChannel } from 'discord.js';
import { Service } from '../types/service';
import { config } from '../config';

interface UserMessageInfo {
  messages: { id: string; channelId: string; timestamp: number }[];
  count: number;
}

export class MessageSpamMonitorService extends Service {
  private userMessages: Map<string, UserMessageInfo> = new Map();
  private totalMessages = 0;

  init() {
    this.client.on(Events.MessageCreate, this.onMessageCreate.bind(this));
  }

  async onMessageCreate(message: Message) {
    if (message.author.bot || message.channel.isDMBased()) return;

    const now = Date.now();
    const userId = message.author.id;

    // Track messages
    let info = this.userMessages.get(userId);
    if (!info) {
      info = { messages: [], count: 0 };
      this.userMessages.set(userId, info);
    }

    info.messages.push({
      id: message.id,
      channelId: message.channel.id,
      timestamp: now
    });

    info.count++;
    this.totalMessages++;

    // Prune every 1000 messages
    if (this.totalMessages % 1000 === 0) {
      for (const info of this.userMessages.values()) {
        info.messages = info.messages.filter(
          (m) => now - m.timestamp <= 60 * 1000
        );
      }
    }

    // Check for spam based on config values, i.e. messages in multiple channels
    const recent = info.messages.filter(
      (m) => now - m.timestamp <= config.spam_time_window_ms
    );
    const uniqueChannels = new Set(recent.map((m) => m.channelId));

    if (uniqueChannels.size >= config.spam_channel_limit) {
      for (const m of info.messages) {
        try {
          const channel = await this.client.channels.fetch(m.channelId);
          if (channel && channel.isTextBased()) {
            await (channel as TextChannel).messages.delete(m.id);
          }
        } catch {}
      }

      // Ping mods in mod channel
      const modChannel = await this.client.channels.fetch(
        config.moderator_channel
      );

      if (modChannel && modChannel.isTextBased()) {
        await (modChannel as TextChannel).send(
          `<@&${config.moderator_id}> User <@${userId}> spammed messages in ${config.spam_channel_limit} or more channels in ${config.spam_time_window_ms / 1000} seconds. All messages deleted. See <#${config.message_history_channel}> for deleted messages.`
        );
      }

      // Clear user's messages
      info.messages = [];
    }
  }
}
