"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpyService = void 0;
const discord_js_1 = require("discord.js");
const service_1 = require("../types/service");
const config_1 = require("../config");
const utils_1 = require("../utils");
const momentum_color_1 = require("../momentum-color");
class SpyService extends service_1.Service {
    messageLogChannel;
    joinLogChannel;
    async init() {
        this.messageLogChannel = await this.client.channels
            .fetch(config_1.config.message_history_channel)
            .then((ch) => (ch?.isTextBased() ? ch : undefined));
        this.joinLogChannel = await this.client.channels
            .fetch(config_1.config.join_log_channel)
            .then((ch) => (ch?.isTextBased() ? ch : undefined));
        if (!this.messageLogChannel || !this.joinLogChannel) {
            throw new Error(`Failed to initialize spy module: text channel ${!this.messageLogChannel
                ? config_1.config.message_history_channel
                : config_1.config.join_log_channel} is not found`);
        }
        this.client.on(discord_js_1.Events.GuildMemberAdd, this.guildMemeberAdd.bind(this));
        this.client.on(discord_js_1.Events.MessageDelete, this.messageDelete.bind(this));
        this.client.on(discord_js_1.Events.MessageUpdate, this.messageUpdate.bind(this));
        this.client.on(discord_js_1.Events.MessageBulkDelete, this.messageBulkDelete.bind(this));
    }
    async guildMemeberAdd(member) {
        if (!this.joinLogChannel)
            return;
        const accountAge = new Date().getTime() - member.user.createdTimestamp;
        const userJoinedMessage = await this.joinLogChannel?.send(`<@${member.id}> ${member.user.username} joined, account was created ${(0, utils_1.timeSpanToPrettyPrint)(accountAge)} ago`);
        if (accountAge <= 24 * 60 * 60 * 1000) {
            await userJoinedMessage.react(config_1.config.new_account_emote);
        }
    }
    async messageDelete(message, bulk = false) {
        if (!this.messageLogChannel)
            return;
        if (!message.partial) {
            if (!message.author || message.author?.bot)
                return;
            const embed = this.addMessageContentToEmbed(new discord_js_1.EmbedBuilder()
                .setTitle(bulk ? "Message Purged" : "Message Deleted")
                .setColor(bulk ? momentum_color_1.MomentumColor.Red : discord_js_1.Colors.Orange), message);
            await this.messageLogChannel.send({ embeds: [embed] });
        }
        else {
            await this.messageLogChannel.send("A message was deleted, but it was not in cache.");
        }
    }
    async messageUpdate(oldMessage, newMessage) {
        if (!this.messageLogChannel)
            return;
        if (!oldMessage.partial) {
            if (!oldMessage.author || !newMessage.author)
                return;
            if (newMessage.author.id == this.client.user.id)
                return;
            if (oldMessage.content === newMessage.content &&
                oldMessage.embeds.length === 0 &&
                newMessage.embeds.length !== 0)
                return;
            const embed = this.addMessageContentToEmbed(new discord_js_1.EmbedBuilder()
                .setTitle("Message Edited - Old Message Content")
                .setColor(momentum_color_1.MomentumColor.Blue)
                .setDescription(`[Jump to Message](${oldMessage.url})`), oldMessage);
            await this.messageLogChannel.send({ embeds: [embed] });
        }
        else {
            await this.messageLogChannel.send("A message was updated, but it was not in cache. " + newMessage.url);
        }
    }
    async messageBulkDelete(messages, _channel) {
        for (const message of messages.values()) {
            await this.messageDelete(message, true);
        }
    }
    addMessageContentToEmbed(embed, message) {
        if (message.author != null) {
            embed.addFields({
                name: "User",
                value: `<@${message.author.id}> ${message.author.username}`,
            });
        }
        if (message.channel != null) {
            embed.addFields({
                name: "Channel",
                value: `<#${message.channel.id}>`,
            });
        }
        if (!!message.content) {
            embed.addFields({
                name: "Message",
                value: message.content.slice(0, 1024),
            });
            if (message.content.length > 1024) {
                embed.addFields({
                    name: "Message Overflow",
                    value: message.content.slice(1024),
                });
            }
        }
        const attachments = message.attachments.values().toArray();
        for (let i = 0; i < attachments.length; i++) {
            embed.addFields({
                name: "Attachment " + (i + 1),
                value: attachments[i].url,
            });
        }
        return embed;
    }
}
exports.SpyService = SpyService;
