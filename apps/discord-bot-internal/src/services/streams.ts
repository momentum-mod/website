import {
  EmbedBuilder,
  GuildTextBasedChannel,
  Message,
  Snowflake
} from 'discord.js';
import { config } from '../config';
import { Service } from '../types/service';
import { TwitchAPI } from '../twitch-api';
import { TwitchStream } from '@momentum/constants';
import { sanitizeMarkdown, timeSpanToPrettyPrint } from '../utils';
import { logger } from '../logger';

export class StreamsService extends Service {
  public twitch = new TwitchAPI();
  private streamsChannel?: GuildTextBasedChannel;
  private streamerIdMessageMap = new Map<string, Snowflake>();
  private messageIdStreamerMap = new Map<string, Snowflake>();
  public softBans = new Set<string>();

  async init() {
    this.streamsChannel = await this.client.channels
      .fetch(config.streamer_channel)
      .then((ch) =>
        ch?.isTextBased() ? (ch as GuildTextBasedChannel) : undefined
      );
    if (!this.streamsChannel) {
      throw new Error(
        `Failed to initialize stream module: text channel ${config.streamer_channel} is not found`
      );
    }

    const messages = await this.streamsChannel?.messages.fetch();
    await this.parseExistingEmbeds(messages.values().toArray());

    setInterval(
      () => this.updateStreams(),
      config.stream_update_interval * 60 * 1000
    );
    void this.updateStreams();
  }

  async updateStreams() {
    const streams = await this.twitch
      .getLiveMomentumModStreams()
      .catch((error) => {
        logger.error(error);
        return null;
      });

    if (streams === null) return;

    if (!this.streamsChannel)
      throw new Error('Tried to update streams without known streams channel');

    const messages = await this.streamsChannel?.messages.fetch();
    const messageList = messages.values().toArray();

    await this.deleteBannedMessages(messageList);
    await this.processEndedStreams(streams, messageList);
    await this.registerSoftBans(messageList);

    await this.sendOrUpdateStreamEmbeds(
      streams.filter(
        (stream) =>
          !this.softBans.has(stream.user_id) &&
          !config.twitch_user_bans.includes(stream.user_id)
      ),
      messageList
    );
  }

  async sendOrUpdateStreamEmbeds(streams: TwitchStream[], messages: Message[]) {
    if (!this.streamsChannel)
      throw new Error(
        'Tried to broadcast streams without known streams channel'
      );

    for (const stream of streams) {
      if (!this.streamerIdMessageMap.has(stream.user_id)) {
        if (stream.viewer_count < config.minimum_stream_viewers_announce)
          continue;

        const [embed, content] = await this.createStreamEmbed(stream);
        const message = await this.streamsChannel.send({
          content,
          embeds: [embed]
        });

        this.streamerIdMessageMap.set(stream.user_id, message.id);
        this.messageIdStreamerMap.set(message.id, stream.user_id);
      } else {
        const messageId = this.streamerIdMessageMap.get(stream.user_id)!;
        const oldMessage = messages.find((msg) => msg.id === messageId);
        if (!oldMessage || oldMessage.author.id !== this.client.user.id)
          continue;

        const [embed, content] = await this.createStreamEmbed(stream);
        await oldMessage.edit({ content, embeds: [embed] });
      }
    }
  }

  async createStreamEmbed(
    stream: TwitchStream
  ): Promise<[EmbedBuilder, string]> {
    const messageText = `${sanitizeMarkdown(
      stream.user_name
    )} has gone live! <@&${config.livestream_mention_role_id}>`;

    const embed = new EmbedBuilder()
      .setTitle(sanitizeMarkdown(stream.title))
      .setColor([145, 70, 255])
      .setAuthor({
        name: stream.user_name,
        iconURL: await this.twitch
          .getUser(stream.user_id)
          .then((user) => user?.profile_image_url),
        url: `https://twitch.tv/${stream.user_login}`
      })
      .setImage(
        stream.thumbnail_url
          .replace('{width}', '1280')
          .replace('{height}', '720') +
          '?q=' +
          Date.now()
      )
      .setURL(`https://twitch.tv/${stream.user_login}`)
      .setTimestamp(Date.now())
      .addFields(
        {
          name: '🔴 Viewers',
          value: stream.viewer_count.toString(),
          inline: true
        },
        {
          name: '🎦 Uptime',
          value: timeSpanToPrettyPrint(
            Date.now() - Date.parse(stream.started_at),
            2
          ),
          inline: true
        }
      )
      .setFooter({
        text: 'Streaming ' + (await this.twitch.getGameName(stream.game_id))
      });

    return [embed, messageText];
  }

  async parseExistingEmbeds(messages: Message[]): Promise<boolean> {
    this.streamerIdMessageMap = new Map();

    messages = messages.filter((m) => m.author.id === this.client.user.id);
    if (messages.length === 0) return true;

    const streams = await this.twitch
      .getLiveMomentumModStreams()
      .catch(() => null);

    if (streams === null) return false;

    await Promise.all(
      messages.map(async (message) => {
        try {
          if (message.embeds.length !== 1) return await message.delete();

          const matchingStream = streams.find(
            (s) => s.user_name === message.embeds[0].author?.name
          );

          if (!matchingStream) return await message.delete();

          if (this.streamerIdMessageMap.has(matchingStream.user_id)) {
            logger.warn(
              `Duplicate cached streamer: ${matchingStream.user_name}, deleting...`
            );
            return await message.delete();
          }

          this.streamerIdMessageMap.set(matchingStream.user_id, message.id);
          this.messageIdStreamerMap.set(message.id, matchingStream.user_id);
        } catch (error) {
          logger.warn(
            { err: error },
            'Failed to parse existing message ' + message.id
          );
        }
      })
    );

    return true;
  }

  async deleteBannedMessages(messages: Message[]) {
    await Promise.all(
      messages
        .map((msg) => [msg, this.messageIdStreamerMap.get(msg.id)] as const)
        .filter(
          ([_, streamerId]) =>
            streamerId !== undefined &&
            config.twitch_user_bans.includes(streamerId)
        )
        .map(async ([msg, streamerId]) => {
          this.messageIdStreamerMap.delete(msg.id);
          this.streamerIdMessageMap.delete(streamerId!);
          try {
            await msg.delete();
          } catch (error) {
            logger.warn(
              { err: error },
              'Failed to delete message of banned stream ' + msg.id
            );
          }
        })
    );
  }

  async processEndedStreams(streams: TwitchStream[], messages: Message[]) {
    let endedStreams = this.streamerIdMessageMap
      .entries()
      .filter(
        ([streamerId]) =>
          !streams.some((stream) => stream.user_id === streamerId)
      )
      .toArray();

    if (endedStreams.length > 0) {
      // Verify that streams really did end because Twitch API sucks
      const liveStreams = await this.twitch.getStreams(
        endedStreams.map(([id]) => id)
      );
      endedStreams = endedStreams.filter(
        ([streamerId]) =>
          !liveStreams.some(
            (stream) =>
              stream.user_id === streamerId &&
              stream.game_id === config.twitch_momentum_mod_game_id
          )
      );
    }

    for (const [streamerId, messageId] of endedStreams) {
      if (this.softBans.has(streamerId)) this.softBans.delete(streamerId);

      const streamMessage = messages.find((msg) => msg.id === messageId);
      if (streamMessage)
        streamMessage
          .delete()
          .catch((error) =>
            logger.warn(
              { err: error },
              'Failed to delete message of ended stream ' + streamMessage.id
            )
          );

      this.streamerIdMessageMap.delete(streamerId);
      this.messageIdStreamerMap.delete(messageId);
    }
  }

  async registerSoftBans(messages: Message[]) {
    const selfMessages = (messages = messages.filter(
      (m) => m.author.id === this.client.user.id
    ));
    const softBannedMessages = this.messageIdStreamerMap
      .entries()
      .filter(
        ([messageId]) => !selfMessages.some((msg) => msg.id === messageId)
      )
      .toArray();

    for (const [messageId, streamerId] of softBannedMessages) {
      logger.info('Registered softban for streamer ' + streamerId);
      this.softBans.add(streamerId);

      this.streamerIdMessageMap.delete(streamerId);
      this.messageIdStreamerMap.delete(messageId);
    }
  }
}
