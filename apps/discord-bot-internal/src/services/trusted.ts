import { Events, Message, MessageType } from 'discord.js';
import { Service } from '../types/service';
import { getService } from './index';
import { DailyMessageCountService } from './daily-message-count';
import { config } from '../config';

export class UserTrustService extends Service {
  init() {
    this.client.on(Events.MessageCreate, this.messageCreate.bind(this));
  }

  async messageCreate(message: Message) {
    if (
      message.author.bot ||
      message.channel.isDMBased() ||
      message.type === MessageType.AutoModerationAction
    )
      return;

    this.logMessageCount(message);
    await this.checkVerifiedRole(message);
  }

  logMessageCount(message: Message) {
    const msgCount = getService(DailyMessageCountService);

    const messageCount = msgCount
      .prepare(
        'SELECT * FROM message_count WHERE UserId=? AND ChannelId=? AND Date=?'
      )
      .get(message.author.id, message.channel.id, message.createdAt);

    if (messageCount) {
      msgCount
        .prepare(
          'UPDATE message_count SET MessageCount=? WHERE UserId=? AND ChannelId=? AND Date=?'
        )
        .get(
          messageCount.MessageCount + 1,
          message.author.id,
          message.channel.id,
          message.createdAt
        );
    } else {
      msgCount
        .prepare(
          'INSERT INTO message_count (MessageCount, UserId, ChannelId, Date) VALUES (?, ?, ?, ?)'
        )
        .run(1, message.author.id, message.channel.id, message.createdAt);
    }
  }

  async checkVerifiedRole(message: Message) {
    if (!message.member) return;
    if (
      message.member.roles.cache.hasAny(
        config.media_verified_role,
        config.media_blacklisted_role
      )
    )
      return;

    const msgCount = getService(DailyMessageCountService);

    const userMessageCounts = msgCount
      .prepare('SELECT * FROM message_count WHERE UserId=?')
      .all(message.author.id)
      .sort((a, b) => a.Date.getTime() - b.Date.getTime());
    if (userMessageCounts.length === 0) return;

    const earliestMessage = userMessageCounts[0];

    if (
      Date.now() - earliestMessage.Date.getTime() >
      config.media_minimum_days * 24 * 60 * 60 * 1000
    ) {
      const messageCount = userMessageCounts.reduce(
        (acc, el) => acc + el.MessageCount,
        0
      );

      if (messageCount > config.media_minimum_messages) {
        message.member.roles.add(config.media_verified_role);
      }
    }
  }
}
