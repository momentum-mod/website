"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveStreamModule = void 0;
const discord_js_1 = require("discord.js");
const streams_1 = require("../services/streams");
const index_1 = require("../index");
const momentum_color_1 = require("../momentum-color");
const utils_1 = require("../utils");
const config_1 = require("../config");
class LiveStreamModule {
    userFilter = utils_1.isAdmin;
    channelFilter = utils_1.isAdminBotChannel;
    commandBuilder = new discord_js_1.SlashCommandBuilder()
        .setName("streamban")
        .setDescription("Twitch ban commands")
        .addSubcommand((builder) => builder
        .setName("add")
        .setDescription("Hard ban a twitch user from the livestream channel")
        .addStringOption((option) => option
        .setName("username")
        .setDescription("Username of Twitch user to ban")
        .setRequired(true)))
        .addSubcommand((builder) => builder
        .setName("remove")
        .setDescription("Remove hard ban of a twitch user")
        .addStringOption((option) => option
        .setName("username")
        .setDescription("Username of Twitch user to unban")
        .setRequired(true)))
        .addSubcommand((builder) => builder
        .setName("list")
        .setDescription("Get a list of Twitch users hard banned from the livestream channel"))
        .addSubcommand((builder) => builder
        .setName("softlist")
        .setDescription("Get a list of Twitch users soft banned from the livestream channel"));
    subcommandMap = {
        add: this.addHardBan,
        remove: this.removeHardBan,
        list: this.listHardBans,
        softlist: this.listSoftBans,
    };
    async executeCommand(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const runner = this.subcommandMap[subcommand];
        if (!this.subcommandMap[subcommand]) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Subcommand '${subcommand}' not found!`, momentum_color_1.MomentumColor.Red, true);
            return;
        }
        await runner.bind(this)(interaction);
    }
    async addHardBan(interaction) {
        const twitchUsername = interaction.options.getString("username");
        if (!twitchUsername)
            return;
        const streams = (0, index_1.getService)(streams_1.StreamsService);
        const userId = await streams.twitch
            .getUserId(twitchUsername)
            .catch(() => null);
        if (!userId) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, "Failed to recieve Twitch user ID or unknown user specified.", discord_js_1.Colors.Orange);
            return;
        }
        config_1.config.twitch_user_bans.push(userId);
        await config_1.config.save();
        void streams.updateStreams();
        await (0, utils_1.replyDescriptionEmbed)(interaction, "Banned user with ID " + userId, discord_js_1.Colors.Orange);
    }
    async removeHardBan(interaction) {
        const twitchUsername = interaction.options.getString("username");
        if (!twitchUsername)
            return;
        const streams = (0, index_1.getService)(streams_1.StreamsService);
        const userId = await streams.twitch
            .getUserId(twitchUsername)
            .catch(() => null);
        if (!userId) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, "Failed to recieve Twitch user ID or unknown user specified.", discord_js_1.Colors.Orange);
            return;
        }
        config_1.config.twitch_user_bans = config_1.config.twitch_user_bans.filter((uid) => uid !== userId);
        await config_1.config.save();
        void streams.updateStreams();
        await (0, utils_1.replyDescriptionEmbed)(interaction, "Unbanned user with ID " + userId, discord_js_1.Colors.Orange);
    }
    async listHardBans(interaction) {
        const bans = config_1.config.twitch_user_bans;
        const streams = (0, index_1.getService)(streams_1.StreamsService);
        const usernames = await Promise.all(bans.map((uid) => streams.twitch
            .getUser(uid)
            .then((user) => `${user?.display_name || ""}: ${uid}`)));
        await interaction.reply({
            embeds: [
                {
                    title: "Twitch Banned IDs",
                    description: (0, utils_1.sanitizeMarkdown)(usernames.join("\n")),
                    color: momentum_color_1.MomentumColor.Blue,
                },
            ],
        });
    }
    async listSoftBans(interaction) {
        const streams = (0, index_1.getService)(streams_1.StreamsService);
        const usernames = await Promise.all(Array.from(streams.softBans).map((uid) => streams.twitch
            .getUser(uid)
            .then((user) => `${user?.display_name || ""}: ${uid}`)));
        await interaction.reply({
            embeds: [
                {
                    title: "Twitch Soft Banned IDs",
                    description: (0, utils_1.sanitizeMarkdown)(usernames.join("\n")),
                    color: momentum_color_1.MomentumColor.Blue,
                },
            ],
        });
    }
}
exports.LiveStreamModule = LiveStreamModule;
