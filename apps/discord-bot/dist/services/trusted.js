"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTrustService = void 0;
const discord_js_1 = require("discord.js");
const service_1 = require("../types/service");
const index_1 = require("../index");
const daily_message_count_1 = require("./daily-message-count");
const config_1 = require("../config");
class UserTrustService extends service_1.Service {
    init() {
        this.client.on(discord_js_1.Events.MessageCreate, this.messageCreate.bind(this));
    }
    async messageCreate(message) {
        if (message.author.bot || message.channel.isDMBased())
            return;
        this.logMessageCount(message);
        await this.checkVerifiedRole(message);
    }
    logMessageCount(message) {
        const msgCount = (0, index_1.getService)(daily_message_count_1.DailyMessageCountService);
        const messageCount = msgCount
            .prepare("SELECT * FROM message_count WHERE UserId=? AND ChannelId=? AND Date=?")
            .get(message.author.id, message.channel.id, message.createdAt);
        if (messageCount) {
            msgCount
                .prepare("UPDATE message_count SET MessageCount=? WHERE UserId=? AND ChannelId=? AND Date=?")
                .get(messageCount.MessageCount + 1, message.author.id, message.channel.id, message.createdAt);
        }
        else {
            msgCount
                .prepare("INSERT INTO message_count (MessageCount, UserId, ChannelId, Date) VALUES (?, ?, ?, ?)")
                .run(1, message.author.id, message.channel.id, message.createdAt);
        }
    }
    async checkVerifiedRole(message) {
        if (!message.member)
            return;
        if (message.member.roles.cache.hasAny(config_1.config.media_verified_role, config_1.config.media_blacklisted_role))
            return;
        const msgCount = (0, index_1.getService)(daily_message_count_1.DailyMessageCountService);
        const userMessageCounts = msgCount
            .prepare("SELECT * FROM message_count WHERE UserId=?")
            .all(message.author.id)
            .sort((a, b) => a.Date.getTime() - b.Date.getTime());
        if (userMessageCounts.length === 0)
            return;
        const earliestMessage = userMessageCounts[0];
        if (new Date().getTime() - earliestMessage.Date.getTime() >
            config_1.config.media_minimum_days * 24 * 60 * 60 * 1000) {
            const messageCount = userMessageCounts.reduce((acc, el) => acc + el.MessageCount, 0);
            if (messageCount > config_1.config.media_minimum_messages) {
                message.member.roles.add(config_1.config.media_verified_role);
            }
        }
    }
}
exports.UserTrustService = UserTrustService;
