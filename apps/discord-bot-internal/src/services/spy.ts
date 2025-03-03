import {
  Colors,
  EmbedBuilder,
  Events,
  GuildMember,
  GuildTextBasedChannel,
  Message,
  PartialMessage,
  ReadonlyCollection
} from 'discord.js';
import { Service } from '../types/service';
import { config } from '../config';
import { timeSpanToPrettyPrint } from '../utils';
import { MomentumColor } from '../momentum-color';

export class SpyService extends Service {
  private messageLogChannel?: GuildTextBasedChannel;
  private joinLogChannel?: GuildTextBasedChannel;

  async init() {
    this.messageLogChannel = await this.client.channels
      .fetch(config.message_history_channel)
      .then((ch) =>
        ch?.isTextBased() ? (ch as GuildTextBasedChannel) : undefined
      );

    this.joinLogChannel = await this.client.channels
      .fetch(config.join_log_channel)
      .then((ch) =>
        ch?.isTextBased() ? (ch as GuildTextBasedChannel) : undefined
      );

    if (!this.messageLogChannel || !this.joinLogChannel) {
      throw new Error(
        `Failed to initialize spy module: text channel ${
          !this.messageLogChannel
            ? config.message_history_channel
            : config.join_log_channel
        } is not found`
      );
    }

    this.client.on(Events.GuildMemberAdd, this.guildMemberAdd.bind(this));
    this.client.on(Events.MessageDelete, this.messageDelete.bind(this));
    this.client.on(Events.MessageUpdate, this.messageUpdate.bind(this));
    this.client.on(Events.MessageBulkDelete, this.messageBulkDelete.bind(this));
  }

  async guildMemberAdd(member: GuildMember) {
    if (!this.joinLogChannel) return;
    const accountAge = Date.now() - member.user.createdTimestamp;

    const userJoinedMessage = await this.joinLogChannel?.send(
      `<@${member.id}> ${
        member.user.username
      } joined, account was created ${timeSpanToPrettyPrint(accountAge)} ago`
    );

    if (accountAge <= 24 * 60 * 60 * 1000) {
      await userJoinedMessage.react(config.new_account_emote);
    }
  }

  async messageDelete(
    message: Message | PartialMessage,
    bulk: boolean = false
  ) {
    if (!this.messageLogChannel) return;

    if (!message.partial) {
      if (!message.author || message.author?.bot) return;
      const embed = this.addMessageContentToEmbed(
        new EmbedBuilder()
          .setTitle(bulk ? 'Message Purged' : 'Message Deleted')
          .setColor(bulk ? MomentumColor.Red : Colors.Orange),
        message
      );

      await this.messageLogChannel.send({ embeds: [embed] });
    } else {
      await this.messageLogChannel.send(
        'A message was deleted, but it was not in cache.'
      );
    }
  }

  async messageUpdate(
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    if (!this.messageLogChannel) return;
    if (!oldMessage.partial) {
      if (!oldMessage.author || !newMessage.author) return;
      if (newMessage.author.id === this.client.user.id) return;

      if (
        oldMessage.content === newMessage.content &&
        oldMessage.embeds.length === 0 &&
        newMessage.embeds.length > 0
      )
        return;

      const embed = this.addMessageContentToEmbed(
        new EmbedBuilder()
          .setTitle('Message Edited - Old Message Content')
          .setColor(MomentumColor.Blue)
          .setDescription(`[Jump to Message](${oldMessage.url})`),
        oldMessage
      );

      await this.messageLogChannel.send({ embeds: [embed] });
    } else {
      await this.messageLogChannel.send(
        'A message was updated, but it was not in cache. ' + newMessage.url
      );
    }
  }

  async messageBulkDelete(
    messages: ReadonlyCollection<string, Message<boolean> | PartialMessage>,
    _channel: GuildTextBasedChannel
  ) {
    for (const message of messages.values()) {
      await this.messageDelete(message, true);
    }
  }

  private addMessageContentToEmbed(
    embed: EmbedBuilder,
    message: Message | PartialMessage
  ) {
    if (message.author != null) {
      embed.addFields({
        name: 'User',
        value: `<@${message.author.id}> ${message.author.username}`
      });
    }

    if (message.channel != null) {
      embed.addFields({
        name: 'Channel',
        value: `<#${message.channel.id}>`
      });
    }

    if (message.content) {
      embed.addFields({
        name: 'Message',
        value: message.content.slice(0, 1024)
      });

      if (message.content.length > 1024) {
        embed.addFields({
          name: 'Message Overflow',
          value: message.content.slice(1024)
        });
      }
    }

    message.attachments.values().forEach(({ url }, i) => {
      embed.addFields({
        name: 'Attachment ' + (i + 1),
        value: url
      });
    });

    return embed;
  }
}
