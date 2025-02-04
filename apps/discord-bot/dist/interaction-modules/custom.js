"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SayModule = exports.CustomModule = void 0;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
const momentum_color_1 = require("../momentum-color");
const utils_1 = require("../utils");
class CustomModule {
    userFilter = utils_1.isModeratorOrHigher;
    MODAL_TITLE_MAX_LENGTH = 45;
    EMBED_TITLE_MAX_LENGTH = 256;
    EMBED_FIELD_MAX_LENGTH = 1024;
    EDITABLE_PARAMS = {
        nullable: [
            "description",
            "button_url",
            "button_label",
            "thumbnail_url",
            "image_url",
        ],
        nonNullable: ["title", "user"],
    };
    commandBuilder = new discord_js_1.SlashCommandBuilder()
        .setName("custom")
        .setDescription("Custom commands moderators can add during runtime and print a fixed response with /say")
        .addSubcommand((builder) => builder
        .setName("add")
        .setDescription("Creates a new custom commands")
        .addStringOption((option) => option
        .setName("name")
        .setDescription("Name of the custom command")
        .setRequired(true)))
        .addSubcommand((builder) => builder
        .setName("remove")
        .setDescription("Deletes a custom commands")
        .addStringOption((option) => option
        .setName("name")
        .setDescription("Name of the custom command")
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand((builder) => builder
        .setName("rename")
        .setDescription("Rename a custom command")
        .addStringOption((option) => option
        .setName("oldname")
        .setDescription("Name of the custom command")
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption((option) => option
        .setName("newname")
        .setDescription("The new name of custom command")
        .setRequired(true)))
        .addSubcommand((builder) => builder
        .setName("list")
        .setDescription("Lists all custom commands")
        .addIntegerOption((option) => option
        .setName("page")
        .setDescription("The new name of custom command")))
        .addSubcommand((builder) => builder
        .setName("edit")
        .setDescription("Change a custom commands")
        .addStringOption((option) => option
        .setName("name")
        .setDescription("Name of the custom command")
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption((option) => option
        .setName("key")
        .setDescription("What you want to change")
        .setChoices(Object.values(this.EDITABLE_PARAMS)
        .flat()
        .map((key) => ({
        name: key,
        value: key,
    }))
        .slice(0, 25))
        .setRequired(true))
        .addStringOption((option) => option.setName("value").setDescription("The new value")))
        .addSubcommand((builder) => builder
        .setName("info")
        .setDescription("Prints command properties")
        .addStringOption((option) => option
        .setName("name")
        .setDescription("Name of the custom command")
        .setRequired(true)
        .setAutocomplete(true)));
    contextMenuBuilder = new discord_js_1.ContextMenuCommandBuilder()
        .setName("Add as custom command")
        .setType(discord_js_1.ApplicationCommandType.Message);
    subcommandMap = {
        add: this.addCustom,
        remove: this.removeCustom,
        rename: this.renameCustom,
        list: this.listCustom,
        edit: this.editCustom,
        info: this.infoCustom,
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
    async addCustom(interaction) {
        const commandName = interaction.options.getString("name");
        if (!commandName || config_1.config.custom_commands[commandName]) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${commandName}' already exists!`, momentum_color_1.MomentumColor.Red, true);
            return;
        }
        const modalId = this.createModalId("customadd");
        const titleInputId = "id-title";
        const descriptionInputId = "id-description";
        let modalTitle = `Add custom command '${commandName}'`;
        modalTitle = this.clipString(modalTitle, this.MODAL_TITLE_MAX_LENGTH);
        const modal = new discord_js_1.ModalBuilder()
            .setTitle(modalTitle)
            .setCustomId(modalId)
            .addComponents([
            new discord_js_1.ActionRowBuilder().addComponents([
                new discord_js_1.TextInputBuilder()
                    .setCustomId(titleInputId)
                    .setLabel("Title")
                    .setMaxLength(this.EMBED_TITLE_MAX_LENGTH)
                    .setStyle(discord_js_1.TextInputStyle.Short),
            ]),
            new discord_js_1.ActionRowBuilder().addComponents([
                new discord_js_1.TextInputBuilder()
                    .setCustomId(descriptionInputId)
                    .setLabel("Description")
                    .setStyle(discord_js_1.TextInputStyle.Paragraph)
                    .setRequired(false),
            ]),
        ]);
        await interaction.showModal(modal);
        const modalResponse = await interaction
            .awaitModalSubmit({
            time: 5 * 60 * 1000,
            filter: (i) => i.customId === modalId && i.user.id == interaction.user.id,
        })
            .catch(() => undefined);
        if (!modalResponse)
            return;
        const titleRes = modalResponse.fields.getTextInputValue(titleInputId);
        const descriptionRes = modalResponse.fields.getTextInputValue(descriptionInputId);
        // Let's double check real quick, 5 minutes could pass and someone might've created this command
        if (config_1.config.custom_commands[commandName]) {
            await (0, utils_1.replyDescriptionEmbed)(modalResponse, `Command '${commandName}' already exists!`, momentum_color_1.MomentumColor.Red, true);
            return;
        }
        config_1.config.custom_commands[commandName] = {
            title: titleRes,
            description: descriptionRes || null,
            button_url: null,
            button_label: null,
            thumbnail_url: null,
            image_url: null,
            user: `<@!${interaction.user.id}>`,
            creation_timestamp: new Date().toISOString(),
        };
        await config_1.config.save();
        await (0, utils_1.replyDescriptionEmbed)(modalResponse, `Command '${commandName}' added.`, momentum_color_1.MomentumColor.Blue);
    }
    async removeCustom(interaction) {
        const commandName = interaction.options.getString("name");
        if (!commandName || !config_1.config.custom_commands[commandName]) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${commandName}' not found`, momentum_color_1.MomentumColor.Red);
        }
        else {
            delete config_1.config.custom_commands[commandName];
            await config_1.config.save();
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${commandName}' removed`, momentum_color_1.MomentumColor.Blue);
        }
    }
    async renameCustom(interaction) {
        const oldName = interaction.options.getString("oldname");
        const newName = interaction.options.getString("newname");
        if (!newName)
            return;
        if (config_1.config.custom_commands[newName]) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${newName}' already exists!`, momentum_color_1.MomentumColor.Red);
            return;
        }
        if (!oldName || !config_1.config.custom_commands[oldName]) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${oldName}' doesn't exist.`, momentum_color_1.MomentumColor.Red);
            return;
        }
        config_1.config.custom_commands[newName] = structuredClone(config_1.config.custom_commands[oldName]);
        delete config_1.config.custom_commands[oldName];
        await config_1.config.save();
        await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${oldName}' was renamed to '${newName}'.`, momentum_color_1.MomentumColor.Blue);
    }
    async listCustom(interaction) {
        let page = interaction.options.getInteger("page") || 1;
        const perPage = 25;
        const commandEntries = Object.entries(config_1.config.custom_commands);
        const pageCount = Math.ceil(commandEntries.length / perPage);
        if (page > pageCount)
            page = pageCount;
        if (page < 1)
            page = 1;
        let sortedCommands = commandEntries.sort(([_k1, v1], [_k2, v2]) => {
            return (new Date(v2.creation_timestamp).getTime() -
                new Date(v1.creation_timestamp).getTime());
        });
        let title = "Custom Commands";
        if (pageCount > 1) {
            title += ` (Page ${page}/${pageCount})`;
            const startI = (page - 1) * perPage;
            sortedCommands = sortedCommands.slice(startI, startI + perPage);
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setColor(momentum_color_1.MomentumColor.Blue)
            .addFields(...sortedCommands.map(([key, command]) => {
            const date = new Date(command.creation_timestamp);
            const timestamp = Math.floor(date.getTime() / 1000);
            return {
                name: key,
                value: `Added <t:${timestamp}:R> by ${command.user ?? "<unknown>"}.`,
            };
        }));
        await interaction.reply({ embeds: [embed] });
    }
    async editCustom(interaction) {
        const commandName = interaction.options.getString("name");
        const key = interaction.options.getString("key");
        const value = interaction.options.getString("value") || null;
        if (!commandName || !config_1.config.custom_commands[commandName]) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${commandName}' doesn't exist.`, momentum_color_1.MomentumColor.Red);
            return;
        }
        const command = config_1.config.custom_commands[commandName];
        if (!key || !Object.keys(command).includes(key)) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `No config property found for '${key}'.`, discord_js_1.Colors.Orange);
            return;
        }
        if (key === "description") {
            const valueInputId = "id-value";
            const modalId = this.createModalId("customedit");
            let modalTitle = `Edit custom command '${commandName}'`;
            modalTitle = this.clipString(modalTitle, this.MODAL_TITLE_MAX_LENGTH);
            const modal = new discord_js_1.ModalBuilder()
                .setTitle(modalTitle)
                .setCustomId(modalId)
                .addComponents([
                new discord_js_1.ActionRowBuilder().addComponents([
                    new discord_js_1.TextInputBuilder()
                        .setLabel("Description")
                        .setCustomId(valueInputId)
                        .setValue(command.description || "")
                        .setStyle(discord_js_1.TextInputStyle.Paragraph),
                ]),
            ]);
            await interaction.showModal(modal);
            const modalResponse = await interaction
                .awaitModalSubmit({
                time: 5 * 60 * 1000,
                filter: (i) => i.customId === modalId && i.user.id == interaction.user.id,
            })
                .catch(() => undefined);
            if (!modalResponse)
                return;
            config_1.config.custom_commands[commandName].description =
                modalResponse.fields.getTextInputValue(valueInputId);
            await config_1.config.save();
            await (0, utils_1.replyDescriptionEmbed)(modalResponse, `Successfully updated '${commandName}' description.`, momentum_color_1.MomentumColor.Blue);
            return;
        }
        if (this.EDITABLE_PARAMS.nonNullable.includes(key) && value === null) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Can't set '${key}' to null`, momentum_color_1.MomentumColor.Red);
            return;
        }
        // Bypassing type checks, yippieeeeee
        Object.assign(config_1.config.custom_commands[commandName], { [key]: value });
        if (command.thumbnail_url === null &&
            key === "button_url" &&
            command.button_url !== null) {
            try {
                const url = new URL(command.button_url);
                if (url.host === "www.youtube.com" && url.searchParams.has("v")) {
                    config_1.config.custom_commands[commandName].thumbnail_url = `https://img.youtube.com/vi/${url.searchParams.get("v")}/mqdefault.jpg`;
                }
            }
            catch { }
        }
        await config_1.config.save();
        await (0, utils_1.replyDescriptionEmbed)(interaction, `Set '${key}' to '${value}'.`, momentum_color_1.MomentumColor.Blue);
    }
    async infoCustom(interaction) {
        const commandName = interaction.options.getString("name");
        if (!commandName || !config_1.config.custom_commands[commandName]) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${commandName}' doesn't exist.`, momentum_color_1.MomentumColor.Red);
            return;
        }
        const commandParameters = Object.entries(config_1.config.custom_commands[commandName]);
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`Command '${commandName}' properties`)
            .setColor(momentum_color_1.MomentumColor.Blue)
            .addFields(...commandParameters.map(([key, value]) => {
            let valueString = value === null ? "<null>" : value.toString();
            valueString = this.clipString(valueString, this.EMBED_FIELD_MAX_LENGTH);
            return {
                name: key,
                value: valueString,
            };
        }));
        await interaction.reply({ embeds: [embed] });
    }
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        await customCommandAutocomplete(interaction, focused.value);
    }
    async contextMenuHandler(interaction) {
        if (!interaction.isMessageContextMenuCommand())
            return;
        const message = interaction.targetMessage;
        const createdCommand = {
            title: "",
            description: message.content,
            button_url: null,
            button_label: null,
            thumbnail_url: null,
            image_url: null,
            user: `<@!${interaction.user.id}>`,
            creation_timestamp: new Date().toISOString(),
        };
        if (message.embeds.length !== 0) {
            const embed = message.embeds[0];
            createdCommand.title = embed.title || "";
            createdCommand.description = embed.description || "";
            if (embed.thumbnail)
                createdCommand.thumbnail_url = embed.thumbnail.url;
            if (embed.image)
                createdCommand.image_url = embed.image.url;
        }
        const buttonComponent = message.components
            .flatMap((row) => row.components)
            .find((component) => component.type === discord_js_1.ComponentType.Button);
        if (buttonComponent && buttonComponent.url && buttonComponent.label) {
            createdCommand.button_url = buttonComponent.url;
            createdCommand.button_label = buttonComponent.label;
        }
        const modalId = this.createModalId("ascustom");
        const nameInputId = "id-name";
        const modal = new discord_js_1.ModalBuilder()
            .setTitle("Custom command name")
            .setCustomId(modalId)
            .addComponents([
            new discord_js_1.ActionRowBuilder().addComponents([
                new discord_js_1.TextInputBuilder()
                    .setCustomId(nameInputId)
                    .setLabel("Name")
                    .setMaxLength(100)
                    .setStyle(discord_js_1.TextInputStyle.Short),
            ]),
        ]);
        await interaction.showModal(modal);
        const modalResponse = await interaction
            .awaitModalSubmit({
            time: 30 * 1000,
            filter: (i) => i.customId === modalId && i.user.id == interaction.user.id,
        })
            .catch(() => undefined);
        if (!modalResponse)
            return;
        const commandName = modalResponse.fields.getTextInputValue(nameInputId);
        if (config_1.config.custom_commands[commandName]) {
            await (0, utils_1.replyDescriptionEmbed)(modalResponse, `Command '${commandName}' already exists!`, momentum_color_1.MomentumColor.Red, true);
            return;
        }
        config_1.config.custom_commands[commandName] = createdCommand;
        await config_1.config.save();
        await (0, utils_1.replyDescriptionEmbed)(modalResponse, `Command '${commandName}' created from message: ${message.url}`, momentum_color_1.MomentumColor.Blue);
    }
    modalIdCounter = 0;
    createModalId(name) {
        // The modalIdCounter is added in case one user starts multiple waits (i. e. cancels the popup and tries again)
        const id = this.modalIdCounter++;
        if (this.modalIdCounter === Number.MAX_SAFE_INTEGER)
            this.modalIdCounter = 0;
        return `id-modal-${name}-${id}`;
    }
    clipString(value, maxLength, trim = "...") {
        if (value.length > maxLength) {
            return value.slice(0, maxLength - trim.length) + trim;
        }
        return value;
    }
}
exports.CustomModule = CustomModule;
class SayModule {
    static commandName = "say";
    userFilter = utils_1.isTrusted;
    commandBuilder = new discord_js_1.SlashCommandBuilder()
        .setName(SayModule.commandName)
        .setDescription("Executes a custom command")
        .addStringOption((option) => option
        .setName("option")
        .setDescription("Name of the custom command")
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption((option) => option
        .setName("reply")
        .setDescription("Reply to this message")
        .setAutocomplete(true));
    async executeCommand(interaction) {
        const commandName = interaction.options.getString("option");
        if (!commandName || !config_1.config.custom_commands[commandName]) {
            await (0, utils_1.replyDescriptionEmbed)(interaction, `Command '${commandName}' doesn't exist!`, momentum_color_1.MomentumColor.Red);
            return;
        }
        const command = config_1.config.custom_commands[commandName];
        if (!command.title && !command.description) {
            command.title = "<title here!>";
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(command.title)
            .setDescription(command.description)
            .setColor(momentum_color_1.MomentumColor.Blue);
        if (command.thumbnail_url) {
            embed.setThumbnail(command.thumbnail_url);
            if (embed.data.thumbnail) {
                embed.data.thumbnail.height = 90;
                embed.data.thumbnail.width = 160;
            }
        }
        if (command.image_url) {
            embed.setImage(command.image_url);
        }
        const components = [];
        const row = new discord_js_1.ActionRowBuilder();
        if (command.button_url) {
            const button = new discord_js_1.ButtonBuilder()
                .setLabel(command.button_label ?? "Link")
                .setStyle(discord_js_1.ButtonStyle.Link)
                .setURL(command.button_url);
            if (button.data.url) {
                row.addComponents(button);
                components.push(row);
            }
        }
        const replyMessageId = interaction.options.getString("reply");
        if (replyMessageId) {
            embed.setFooter({
                text: `${interaction.user.displayName} used /${interaction.commandName} ${commandName}`,
                iconURL: interaction.user.avatarURL() || undefined,
            });
            const message = await interaction.channel?.messages
                .fetch(replyMessageId)
                .catch(() => undefined);
            if (!message) {
                await (0, utils_1.replyDescriptionEmbed)(interaction, `Can't find message ${replyMessageId} in this channel.`, momentum_color_1.MomentumColor.Red);
                return;
            }
            await interaction.channel?.send({
                embeds: [embed],
                components,
                reply: { messageReference: replyMessageId },
            });
            await interaction.reply({
                embeds: [
                    {
                        title: `Replied to message ${replyMessageId}.`,
                        description: message.url,
                        color: momentum_color_1.MomentumColor.Blue,
                    },
                ],
                ephemeral: true,
            });
            return;
        }
        await interaction.reply({ embeds: [embed], components });
    }
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name === "option") {
            await customCommandAutocomplete(interaction, focused.value);
        }
        if (focused.name === "reply") {
            const lastMessages = await interaction.channel?.messages.fetch();
            if (!lastMessages)
                return;
            const messages = [...lastMessages.values()]
                .filter((msg) => !msg.author.bot &&
                msg.system !== true &&
                msg.content.includes(focused.value))
                .slice(0, 25);
            await interaction.respond(messages.map((msg) => ({
                name: `${msg.author.displayName}: ${msg.content.replace(/\n/g, " ")}`,
                value: msg.id,
            })));
        }
    }
}
exports.SayModule = SayModule;
async function customCommandAutocomplete(interaction, value) {
    const commands = Object.keys(config_1.config.custom_commands);
    const choices = findCommand(commands, value);
    // Do we really need emojis in custom commands?
    // if (choices.length === 0) {
    //   const emoji = parseEmoji(focusedValue)
    //   if(emoji) choices = findCommand(commands, emoji.?)
    // }
    await interaction.respond(choices.map((choice) => ({ name: choice, value: choice })));
}
function findCommand(commands, query) {
    return commands
        .filter((key) => key.includes(query))
        .slice(0, 25)
        .sort();
}
