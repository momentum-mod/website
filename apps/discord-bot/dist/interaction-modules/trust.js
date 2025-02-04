"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustedModule = void 0;
const discord_js_1 = require("discord.js");
const daily_message_count_1 = require("../services/daily-message-count");
const index_1 = require("../index");
const momentum_color_1 = require("../momentum-color");
const config_1 = require("../config");
const utils_1 = require("../utils");
class TrustedModule {
    userFilter = utils_1.isModeratorOrHigher;
    channelFilter = utils_1.isAdminBotChannel;
    commandBuilder = new discord_js_1.SlashCommandBuilder()
        .setName("trust")
        .setDescription("Media trust commands")
        .addSubcommand((builder) => builder
        .setName("status")
        .setDescription("Checks to see a member's media trust status")
        .addUserOption((option) => option.setName("member").setDescription("Member").setRequired(true)));
    async executeCommand(interaction) {
        const member = interaction.options.getMember("member");
        if (!member)
            return;
        await interaction.deferReply();
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle("Media Trust Status")
            .setAuthor({
            name: member.user.username,
            iconURL: member.displayAvatarURL(),
        })
            .setColor(discord_js_1.Colors.Orange);
        const msgCount = (0, index_1.getService)(daily_message_count_1.DailyMessageCountService);
        const userMessageCounts = msgCount
            .prepare("SELECT * FROM message_count WHERE UserId=?")
            .all(member.id)
            .sort((a, b) => a.Date.getTime() - b.Date.getTime());
        const earliestMessage = userMessageCounts[0];
        if (!earliestMessage) {
            embed.setDescription("No recorded activity");
        }
        else {
            const totalMessageCount = userMessageCounts.reduce((acc, el) => acc + el.MessageCount, 0);
            const oldestMessageSpan = Date.now() - earliestMessage.Date.getTime();
            const meetsRequirements = totalMessageCount > config_1.config.media_minimum_messages &&
                new Date().getTime() - earliestMessage.Date.getTime() >
                    config_1.config.media_minimum_days * 24 * 60 * 60 * 1000;
            embed.addFields({
                name: "Oldest Message Sent",
                value: (0, utils_1.timeSpanToPrettyPrint)(oldestMessageSpan) + " ago",
            }, {
                name: "Total Messages",
                value: totalMessageCount.toString(),
            }, { name: "Meets Requirements", value: meetsRequirements.toString() });
        }
        const hasTrustedRole = member.roles.cache.has(config_1.config.media_verified_role);
        const hasBlacklistedRole = member.roles.cache.has(config_1.config.media_blacklisted_role);
        if (hasTrustedRole) {
            embed.setColor(momentum_color_1.MomentumColor.Blue);
        }
        else if (hasBlacklistedRole) {
            embed.setColor(momentum_color_1.MomentumColor.Red);
        }
        embed.addFields({ name: "Has Trusted Role", value: hasTrustedRole.toString() }, { name: "Has Blacklisted Role", value: hasBlacklistedRole.toString() });
        await interaction.editReply({ embeds: [embed] });
    }
}
exports.TrustedModule = TrustedModule;
