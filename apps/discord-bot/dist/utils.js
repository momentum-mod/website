"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyDescriptionEmbed = replyDescriptionEmbed;
exports.isModeratorOrHigher = isModeratorOrHigher;
exports.isAdmin = isAdmin;
exports.isTrusted = isTrusted;
exports.isAdminBotChannel = isAdminBotChannel;
exports.sanitizeMarkdown = sanitizeMarkdown;
exports.timeSpanToPrettyPrint = timeSpanToPrettyPrint;
const config_1 = require("./config");
async function replyDescriptionEmbed(interaction, text, color, ephemeral = false) {
    await interaction.reply({
        embeds: [
            {
                description: text,
                color,
            },
        ],
        ephemeral,
    });
}
function isModeratorOrHigher(member) {
    return member.roles.cache.hasAny(config_1.config.moderator_id, config_1.config.admin_id);
}
function isAdmin(member) {
    return member.roles.cache.has(config_1.config.admin_id);
}
function isTrusted(member) {
    return member.roles.cache.has(config_1.config.media_verified_role);
}
function isAdminBotChannel(channel) {
    return channel.id === config_1.config.admin_bot_channel;
}
// Stolen from DSharpPlus
function sanitizeMarkdown(input) {
    return input.replace(/([`\*_~<>\[\]\(\)""@\!\&#:\|])/g, "\\$1");
}
function timeSpanToPrettyPrint(totalMilliseconds, accuracy = 3) {
    if (totalMilliseconds < 1)
        return "instantaneously";
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const years = Math.floor(totalDays / 365);
    const days = totalDays - 365 * years;
    const hours = totalHours - 24 * totalDays;
    const minutes = totalMinutes - 60 * totalHours;
    const seconds = totalSeconds - 60 * totalMinutes;
    const millis = totalMilliseconds - 1000 * totalSeconds;
    let res = "";
    if (years > 0) {
        res += `${years} year${years > 1 ? "s" : ""} `;
    }
    if (days > 0) {
        res += `${days} day${days > 1 ? "s" : ""} `;
    }
    if (hours > 0) {
        res += `${hours} hour${hours > 1 ? "s" : ""} `;
    }
    if (minutes > 0) {
        res += `${minutes} minute${minutes > 1 ? "s" : ""} `;
    }
    if (seconds > 0) {
        res += `${seconds} second${seconds > 1 ? "s" : ""} `;
    }
    if (totalSeconds < 1 && millis > 0) {
        res += `${millis} millisecond${millis > 1 ? "s" : ""} `;
    }
    return res
        .split(" ", accuracy * 2)
        .join(" ")
        .trim();
}
