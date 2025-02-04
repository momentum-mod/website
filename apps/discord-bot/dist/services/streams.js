"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamsService = void 0;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
const service_1 = require("../types/service");
const twitch_api_1 = require("../twitch-api");
const utils_1 = require("../utils");
class StreamsService extends service_1.Service {
    twitch = new twitch_api_1.TwitchAPI();
    streamsChannel;
    streamerIdMessageMap = new Map();
    messageIdStreamerMap = new Map();
    softBans = new Set();
    async init() {
        await this.twitch.getMomentumModId();
        this.streamsChannel = await this.client.channels
            .fetch(config_1.config.streamer_channel)
            .then((ch) => (ch?.isTextBased() ? ch : undefined));
        if (!this.streamsChannel) {
            throw new Error(`Failed to initialize stream module: text channel ${config_1.config.streamer_channel} is not found`);
        }
        const messages = await this.streamsChannel?.messages.fetch();
        await this.parseExistingEmbeds(messages.values().toArray());
        setInterval(this.updateStreams.bind(this), config_1.config.stream_update_interval * 60 * 1000);
        void this.updateStreams();
    }
    async updateStreams() {
        const streams = await this.twitch
            .getLiveMomentumModStreams()
            .catch(() => null);
        if (streams === null)
            return;
        if (!this.streamsChannel)
            throw new Error("Tried to update streams without known streams channel");
        const messages = await this.streamsChannel?.messages.fetch();
        const messageList = messages.values().toArray();
        await this.deleteBannedMessages(messageList);
        await this.processEndedStreams(streams, messageList);
        await this.registerSoftBans(messageList);
        await this.sendOrUpdateStreamEmbeds(streams.filter((stream) => !this.softBans.has(stream.user_id) &&
            !config_1.config.twitch_user_bans.includes(stream.user_id)), messageList);
    }
    async sendOrUpdateStreamEmbeds(streams, messages) {
        if (!this.streamsChannel)
            throw new Error("Tried to broadcast streams without known streams channel");
        for (const stream of streams) {
            if (!this.streamerIdMessageMap.has(stream.user_id)) {
                if (stream.viewer_count < config_1.config.minimum_stream_viewers_announce)
                    continue;
                const [embed, content] = await this.createStreamEmbed(stream);
                const message = await this.streamsChannel.send({
                    content,
                    embeds: [embed],
                });
                this.streamerIdMessageMap.set(stream.user_id, message.id);
                this.messageIdStreamerMap.set(message.id, stream.user_id);
            }
            else {
                const messageId = this.streamerIdMessageMap.get(stream.user_id);
                const oldMessage = messages.find((msg) => msg.id === messageId);
                if (!oldMessage || oldMessage.author.id !== this.client.user.id)
                    continue;
                const [embed, content] = await this.createStreamEmbed(stream);
                await oldMessage.edit({ content, embeds: [embed] });
            }
        }
    }
    async createStreamEmbed(stream) {
        const messateText = `${(0, utils_1.sanitizeMarkdown)(stream.user_name)} has gone live! <@&${config_1.config.livestream_mention_role_id}>`;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle((0, utils_1.sanitizeMarkdown)(stream.title))
            .setColor([145, 70, 255])
            .setAuthor({
            name: stream.user_name,
            iconURL: await this.twitch
                .getUser(stream.user_id)
                .then((user) => user?.profile_image_url),
            url: `https://twitch.tv/${stream.user_login}`,
        })
            .setImage(stream.thumbnail_url
            .replace("{width}", "1280")
            .replace("{height}", "720") +
            "?q=" +
            Date.now())
            .setURL(`https://twitch.tv/${stream.user_login}`)
            .setTimestamp(Date.now())
            .addFields({
            name: "🔴 Viewers",
            value: stream.viewer_count.toString(),
            inline: true,
        }, {
            name: "🎦 Uptime",
            value: (0, utils_1.timeSpanToPrettyPrint)(Date.now() - Date.parse(stream.started_at), 2),
            inline: true,
        })
            .setFooter({
            text: "Streaming " + (await this.twitch.getGameName(stream.game_id)),
        });
        return [embed, messateText];
    }
    async parseExistingEmbeds(messages) {
        this.streamerIdMessageMap = new Map();
        messages = messages.filter((m) => m.author.id === this.client.user.id);
        if (messages.length === 0)
            return true;
        const streams = await this.twitch
            .getLiveMomentumModStreams()
            .catch(() => null);
        if (streams === null)
            return false;
        await Promise.all(messages.map(async (message) => {
            try {
                if (message.embeds.length !== 1)
                    return await message.delete();
                const matchingStream = streams.find((s) => s.user_name === message.embeds[0].author?.name);
                if (!matchingStream)
                    return await message.delete();
                if (this.streamerIdMessageMap.has(matchingStream.user_id)) {
                    console.warn(`Duplicate cached streamer: ${matchingStream.user_name}, deleting...`);
                    return await message.delete();
                }
                this.streamerIdMessageMap.set(matchingStream.user_id, message.id);
                this.messageIdStreamerMap.set(message.id, matchingStream.user_id);
            }
            catch (e) {
                console.warn("Failed to parse existing message " + message.id, e);
            }
        }));
        return true;
    }
    async deleteBannedMessages(messages) {
        await Promise.all(messages
            .map((msg) => [msg, this.messageIdStreamerMap.get(msg.id)])
            .filter(([_, streamerId]) => streamerId !== undefined &&
            config_1.config.twitch_user_bans.includes(streamerId))
            .map(async ([msg, streamerId]) => {
            this.messageIdStreamerMap.delete(msg.id);
            this.streamerIdMessageMap.delete(streamerId);
            try {
                await msg.delete();
            }
            catch (e) {
                console.warn("Failed to delete message of banned stream " + msg.id, e);
            }
        }));
    }
    async processEndedStreams(streams, messages) {
        const endedStreams = this.streamerIdMessageMap
            .entries()
            .toArray()
            .filter(([streamerId]) => streams.findIndex((stream) => stream.user_id === streamerId) === -1);
        for (const [streamerId, messageId] of endedStreams) {
            if (this.softBans.has(streamerId))
                this.softBans.delete(streamerId);
            const streamMessage = messages.find((msg) => msg.id === messageId);
            if (streamMessage)
                streamMessage
                    .delete()
                    .catch((e) => console.warn("Failed to delete message of ended stream " + streamMessage.id, e));
            this.streamerIdMessageMap.delete(streamerId);
            this.messageIdStreamerMap.delete(messageId);
        }
    }
    async registerSoftBans(messages) {
        const selfMessages = (messages = messages.filter((m) => m.author.id === this.client.user.id));
        const softBannedMessages = this.messageIdStreamerMap
            .entries()
            .toArray()
            .filter(([messageId]) => selfMessages.findIndex((msg) => msg.id === messageId) === -1);
        for (const [messageId, streamerId] of softBannedMessages) {
            console.log("Registered softban for streamer " + streamerId);
            this.softBans.add(streamerId);
            this.streamerIdMessageMap.delete(streamerId);
            this.messageIdStreamerMap.delete(messageId);
        }
    }
}
exports.StreamsService = StreamsService;
