"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getService = getService;
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const utils_1 = require("./utils");
const momentum_color_1 = require("./momentum-color");
const trusted_1 = require("./services/trusted");
const spy_1 = require("./services/spy");
const streams_1 = require("./services/streams");
const daily_message_count_1 = require("./services/daily-message-count");
const services = [
    daily_message_count_1.DailyMessageCountService,
    trusted_1.UserTrustService,
    spy_1.SpyService,
    streams_1.StreamsService
];
const initializedServices = new Map();
function getService(ctr) {
    if (!initializedServices.has(ctr))
        throw new Error("Attempt to get service before it's initialization: " + ctr);
    return initializedServices.get(ctr);
}
const custom_1 = require("./interaction-modules/custom");
const live_stream_1 = require("./interaction-modules/live-stream");
const trust_1 = require("./interaction-modules/trust");
const restart_1 = require("./interaction-modules/restart");
const interactionModules = [
    custom_1.CustomModule,
    custom_1.SayModule,
    live_stream_1.LiveStreamModule,
    trust_1.TrustedModule,
    restart_1.RestartModule
];
// https://github.com/nodejs/undici/issues/1531#issuecomment-1178869993
const undici_1 = require("undici");
(0, undici_1.setGlobalDispatcher)(new undici_1.Agent({ connect: { timeout: 60000 } }));
const client = new discord_js_1.Client({ intents: [2 ** 25 - 1] });
const commandMap = new Map();
const contextMenus = new Map();
for (const interactionModule of interactionModules) {
    const instance = new interactionModule();
    if (instance.contextMenuBuilder) {
        contextMenus.set(instance.contextMenuBuilder.name, instance);
    }
    commandMap.set(instance.commandBuilder.name, instance);
}
client.once(discord_js_1.Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    await client.rest.put(discord_js_1.Routes.applicationGuildCommands(readyClient.user.id, config_1.config.guild_id), {
        body: [
            ...Array.from(commandMap.values()).map((command) => command.commandBuilder),
            ...Array.from(contextMenus.values()).map((command) => command.contextMenuBuilder)
        ]
    });
    console.log('Commands synced');
    for (const ctr of services) {
        const module = new ctr(client);
        await module.init();
        initializedServices.set(ctr, module);
    }
    console.log('Modules initialized');
});
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    try {
        if (!interaction.isChatInputCommand() &&
            !interaction.isContextMenuCommand() &&
            !interaction.isAutocomplete())
            return;
        const commandName = interaction.commandName;
        const interactionModule = interaction.isContextMenuCommand()
            ? contextMenus.get(commandName)
            : commandMap.get(commandName);
        if (!interactionModule) {
            console.warn('Unknown command: ' + commandName);
            return;
        }
        if (interaction.isAutocomplete()) {
            if (!interactionModule.autocomplete) {
                console.warn('Tried to autocomplete command with unknown name: ' + commandName);
            }
            else {
                await interactionModule.autocomplete(interaction);
            }
            return;
        }
        if (interactionModule.userFilter &&
            (!interaction.member ||
                !interactionModule.userFilter(interaction.member))) {
            if (interaction.member)
                console.debug(`User ${interaction.member?.user.username} (${interaction.member?.user.id}) tried running "/${interactionModule.commandBuilder.name}" with user filter failing`);
            await (0, utils_1.replyDescriptionEmbed)(interaction, 'Permission denied', momentum_color_1.MomentumColor.Red, true);
            return;
        }
        if (interactionModule.channelFilter &&
            (!interaction.channel ||
                !interactionModule.channelFilter(interaction.channel))) {
            if (interaction.member)
                console.debug(`User ${interaction.member?.user.username} (${interaction.member?.user.id}) tried running "/${interactionModule.commandBuilder.name}" with channel filter failing`);
            await (0, utils_1.replyDescriptionEmbed)(interaction, 'Permission denied', momentum_color_1.MomentumColor.Red, true);
            return;
        }
        if (interaction.isContextMenuCommand()) {
            if (!interactionModule.contextMenuHandler) {
                console.warn('Tried to use context menu without context menu handler: ' +
                    commandName);
            }
            else {
                await interactionModule.contextMenuHandler(interaction);
            }
            return;
        }
        await interactionModule.executeCommand(interaction);
    }
    catch (e) {
        console.error(e);
    }
});
client.login(config_1.config.bot_token);
