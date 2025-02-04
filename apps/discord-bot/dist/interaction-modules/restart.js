"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestartModule = void 0;
const discord_js_1 = require("discord.js");
const utils_1 = require("../utils");
class RestartModule {
    userFilter = utils_1.isAdmin;
    channelFilter = utils_1.isAdminBotChannel;
    commandBuilder = new discord_js_1.SlashCommandBuilder()
        .setName("forcerestart")
        .setDescription("Forces the bot to exit the process, and have Docker auto-restart it");
    async executeCommand(interaction) {
        console.warn(`User ${interaction.member?.user.username} (${interaction.member?.user.id}) forced the bot to restart`);
        await (0, utils_1.replyDescriptionEmbed)(interaction, "Restarting ...", discord_js_1.Colors.Orange);
        process.exit(0);
    }
}
exports.RestartModule = RestartModule;
