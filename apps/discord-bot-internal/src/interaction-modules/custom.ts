import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  LinkButtonComponentData,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  Colors,
  ContextMenuCommandInteraction,
  ComponentType,
  GuildTextBasedChannel,
  MessageFlags
} from 'discord.js';
import { InteractionModule } from '../types/interaction-module';
import { config, CustomCommand } from '../config';
import { MomentumColor } from '../momentum-color';
import {
  isModeratorOrHigher,
  isTrusted,
  replyDescriptionEmbed
} from '../utils';

function buildCustomCommandResponse(command: CustomCommand) {
  if (!command.title && !command.description) {
    command.title = '<title here!>';
  }

  const embed = new EmbedBuilder()
    .setTitle(command.title)
    .setDescription(command.description)
    .setColor(MomentumColor.Blue);

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
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (command.button_url) {
    const button = new ButtonBuilder()
      .setLabel(command.button_label ?? 'Link')
      .setStyle(ButtonStyle.Link)
      .setURL(command.button_url);

    if ((button.data as LinkButtonComponentData).url) {
      row.addComponents(button);
      components.push(row);
    }
  }

  return { embed, components };
}

export class CustomModule implements InteractionModule {
  userFilter = isModeratorOrHigher;
  readonly ModalTitleMaxLength = 45;
  readonly EmbedTitleMaxLength = 256;
  readonly EmbedFieldMaxLength = 1024;

  commandBuilder = new SlashCommandBuilder()
    .setName('custom')
    .setDescription(
      'Custom commands moderators can add during runtime and print a fixed response with /say'
    )
    .addSubcommand((builder) =>
      builder
        .setName('add')
        .setDescription('Creates a new custom commands')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Name of the custom command')
            .setRequired(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('remove')
        .setDescription('Deletes a custom commands')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Name of the custom command')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('rename')
        .setDescription('Rename a custom command')
        .addStringOption((option) =>
          option
            .setName('oldname')
            .setDescription('Name of the custom command')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('newname')
            .setDescription('The new name of custom command')
            .setRequired(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('list')
        .setDescription('Lists all custom commands')
        .addIntegerOption((option) =>
          option
            .setName('page')
            .setDescription('The new name of custom command')
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('edit')
        .setDescription('Change a custom commands')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Name of the custom command')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('key')
            .setDescription('What you want to change')
            .setChoices(
              Object.values(EditableCommandParams)
                .flat()
                .map((key) => ({
                  name: key,
                  value: key
                }))
                .slice(0, 25)
            )
            .setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('value').setDescription('The new value')
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('info')
        .setDescription('Prints command properties')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Name of the custom command')
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

  contextMenuBuilder = new ContextMenuCommandBuilder()
    .setName('Add as custom command')
    .setType(ApplicationCommandType.Message);

  private subcommandMap: Record<
    string,
    (i: ChatInputCommandInteraction) => Promise<void>
  > = {
    add: this.addCustom,
    remove: this.removeCustom,
    rename: this.renameCustom,
    list: this.listCustom,
    edit: this.editCustom,
    info: this.infoCustom
  };

  async executeCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const runner = this.subcommandMap[subcommand];

    if (!this.subcommandMap[subcommand]) {
      await replyDescriptionEmbed(
        interaction,
        `Subcommand '${subcommand}' not found!`,
        MomentumColor.Red,
        true
      );
      return;
    }

    await runner.bind(this)(interaction);
  }

  private async addCustom(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('name');
    if (!commandName || config.custom_commands[commandName]) {
      await replyDescriptionEmbed(
        interaction,
        `Command '${commandName}' already exists!`,
        MomentumColor.Red,
        true
      );
      return;
    }

    const modalId = this.createModalId('customadd');
    const titleInputId = 'id-title';
    const descriptionInputId = 'id-description';

    let modalTitle = `Add custom command '${commandName}'`;
    modalTitle = clipString(modalTitle, this.ModalTitleMaxLength);

    const modal = new ModalBuilder()
      .setTitle(modalTitle)
      .setCustomId(modalId)
      .addComponents([
        new ActionRowBuilder<TextInputBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId(titleInputId)
            .setLabel('Title')
            .setMaxLength(this.EmbedTitleMaxLength)
            .setStyle(TextInputStyle.Short)
        ]),
        new ActionRowBuilder<TextInputBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId(descriptionInputId)
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
        ])
      ]);

    await interaction.showModal(modal);

    const modalResponse = await interaction
      .awaitModalSubmit({
        time: 5 * 60 * 1000,
        filter: (i) =>
          i.customId === modalId && i.user.id === interaction.user.id
      })
      .catch(() => {});

    if (!modalResponse) return;

    const titleRes = modalResponse.fields.getTextInputValue(titleInputId);
    const descriptionRes =
      modalResponse.fields.getTextInputValue(descriptionInputId);

    // Let's double check real quick, 5 minutes could pass and someone might've created this command
    if (config.custom_commands[commandName]) {
      await replyDescriptionEmbed(
        modalResponse,
        `Command '${commandName}' already exists!`,
        MomentumColor.Red,
        true
      );
      return;
    }

    config.custom_commands[commandName] = {
      title: titleRes,
      description: descriptionRes || null,
      button_url: null,
      button_label: null,
      thumbnail_url: null,
      image_url: null,
      user: `<@!${interaction.user.id}>`,
      creation_timestamp: new Date().toISOString()
    };
    await config.save();

    await replyDescriptionEmbed(
      modalResponse,
      `Command '${commandName}' added.`,
      MomentumColor.Blue
    );
  }

  private async removeCustom(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('name');
    if (!commandName || !config.custom_commands[commandName]) {
      await replyDescriptionEmbed(
        interaction,
        `Command '${commandName}' not found`,
        MomentumColor.Red
      );
    } else {
      delete config.custom_commands[commandName];
      await config.save();

      await replyDescriptionEmbed(
        interaction,
        `Command '${commandName}' removed`,
        MomentumColor.Blue
      );
    }
  }

  private async renameCustom(interaction: ChatInputCommandInteraction) {
    const oldName = interaction.options.getString('oldname');
    const newName = interaction.options.getString('newname');

    if (!newName) return;

    if (config.custom_commands[newName]) {
      await replyDescriptionEmbed(
        interaction,
        `Command '${newName}' already exists!`,
        MomentumColor.Red
      );
      return;
    }

    if (!oldName || !config.custom_commands[oldName]) {
      await replyDescriptionEmbed(
        interaction,
        `Command '${oldName}' doesn't exist.`,
        MomentumColor.Red
      );
      return;
    }

    config.custom_commands[newName] = structuredClone(
      config.custom_commands[oldName]
    );
    delete config.custom_commands[oldName];
    await config.save();

    await replyDescriptionEmbed(
      interaction,
      `Command '${oldName}' was renamed to '${newName}'.`,
      MomentumColor.Blue
    );
  }

  private async listCustom(interaction: ChatInputCommandInteraction) {
    let page = interaction.options.getInteger('page') || 1;

    const perPage = 25;
    const commandEntries = Object.entries(config.custom_commands);
    const pageCount = Math.ceil(commandEntries.length / perPage);

    if (page > pageCount) page = pageCount;
    if (page < 1) page = 1;

    let sortedCommands = commandEntries.sort(([_k1, v1], [_k2, v2]) => {
      return (
        new Date(v2.creation_timestamp).getTime() -
        new Date(v1.creation_timestamp).getTime()
      );
    });

    let title = 'Custom Commands';
    if (pageCount > 1) {
      title += ` (Page ${page}/${pageCount})`;
      const startI = (page - 1) * perPage;
      sortedCommands = sortedCommands.slice(startI, startI + perPage);
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(MomentumColor.Blue)
      .addFields(
        ...sortedCommands.map(([key, command]) => {
          const date = new Date(command.creation_timestamp);
          const timestamp = Math.floor(date.getTime() / 1000);
          return {
            name: key,
            value: `Added <t:${timestamp}:R> by ${command.user ?? '<unknown>'}.`
          };
        })
      );

    await interaction.reply({ embeds: [embed] });
  }

  private async editCustom(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('name');
    const key = interaction.options.getString('key');
    const value = interaction.options.getString('value') || null;

    if (!commandName || !config.custom_commands[commandName]) {
      await replyDescriptionEmbed(
        interaction,
        `Command '${commandName}' doesn't exist.`,
        MomentumColor.Red
      );
      return;
    }

    const command = config.custom_commands[commandName];

    if (!key || !Object.keys(command).includes(key)) {
      await replyDescriptionEmbed(
        interaction,
        `No config property found for '${key}'.`,
        Colors.Orange
      );
      return;
    }

    if (key === 'description') {
      const valueInputId = 'id-value';
      const modalId = this.createModalId('customedit');

      let modalTitle = `Edit custom command '${commandName}'`;
      modalTitle = clipString(modalTitle, this.ModalTitleMaxLength);

      const modal = new ModalBuilder()
        .setTitle(modalTitle)
        .setCustomId(modalId)
        .addComponents([
          new ActionRowBuilder<TextInputBuilder>().addComponents([
            new TextInputBuilder()
              .setLabel('Description')
              .setCustomId(valueInputId)
              .setValue(command.description || '')
              .setStyle(TextInputStyle.Paragraph)
          ])
        ]);

      await interaction.showModal(modal);

      const modalResponse = await interaction
        .awaitModalSubmit({
          time: 5 * 60 * 1000,
          filter: (i) =>
            i.customId === modalId && i.user.id === interaction.user.id
        })
        .catch(() => {});

      if (!modalResponse) return;

      config.custom_commands[commandName].description =
        modalResponse.fields.getTextInputValue(valueInputId);

      await config.save();
      await replyDescriptionEmbed(
        modalResponse,
        `Successfully updated '${commandName}' description.`,
        MomentumColor.Blue
      );
      return;
    }

    function isCustomCommandKey(key: string): key is keyof CustomCommand {
      return Object.keys(command).includes(key);
    }

    type NullableKey<T, K extends keyof T = keyof T> = K extends unknown
      ? null extends T[K]
        ? K
        : never
      : never;

    function isNullableCustomCommandKey(
      key: string
    ): key is NullableKey<CustomCommand> {
      return (
        Object.keys(command).includes(key) &&
        EditableCommandParams.nullable.includes(key)
      );
    }

    if (!key || !isCustomCommandKey(key)) {
      await replyDescriptionEmbed(
        interaction,
        `No config property found for '${key}'.`,
        MomentumColor.Red
      );
      return;
    }

    if (value === null) {
      if (isNullableCustomCommandKey(key)) {
        config.custom_commands[commandName][key] = value;
      } else {
        await replyDescriptionEmbed(
          interaction,
          `Can't set '${key}' to null`,
          MomentumColor.Red
        );
        return;
      }
    } else {
      config.custom_commands[commandName][key] = value;
    }

    if (
      command.thumbnail_url === null &&
      key === 'button_url' &&
      command.button_url !== null
    ) {
      try {
        const url = new URL(command.button_url);
        if (url.host === 'www.youtube.com' && url.searchParams.has('v')) {
          config.custom_commands[commandName].thumbnail_url =
            `https://img.youtube.com/vi/${url.searchParams.get(
              'v'
            )}/mqdefault.jpg`;
        }
      } catch {}
    }

    await config.save();
    await replyDescriptionEmbed(
      interaction,
      `Set '${key}' to '${value}'.`,
      MomentumColor.Blue
    );
  }

  private async infoCustom(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('name');

    if (!commandName || !config.custom_commands[commandName]) {
      await replyDescriptionEmbed(
        interaction,
        `Command '${commandName}' doesn't exist.`,
        MomentumColor.Red
      );
      return;
    }

    const commandParameters = Object.entries(
      config.custom_commands[commandName]
    );

    const embed = new EmbedBuilder()
      .setTitle(`Command '${commandName}' properties`)
      .setColor(MomentumColor.Blue)
      .addFields(
        ...commandParameters.map(([key, value]) => {
          let valueString = value === null ? '<null>' : value.toString();
          valueString = clipString(valueString, this.EmbedFieldMaxLength);
          return {
            name: key,
            value: valueString
          };
        })
      );

    await interaction.reply({ embeds: [embed] });
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    await customCommandAutocomplete(interaction, focused.value);
  }

  async contextMenuHandler(interaction: ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) return;
    const message = interaction.targetMessage;

    const createdCommand: CustomCommand = {
      title: '',
      description: message.content,
      button_url: null,
      button_label: null,
      thumbnail_url: null,
      image_url: null,
      user: `<@!${interaction.user.id}>`,
      creation_timestamp: new Date().toISOString()
    };

    if (message.embeds.length > 0) {
      const embed = message.embeds[0];
      createdCommand.title = embed.title || '';
      createdCommand.description = embed.description || '';
      if (embed.thumbnail) createdCommand.thumbnail_url = embed.thumbnail.url;
      if (embed.image) createdCommand.image_url = embed.image.url;
    }

    const buttonComponent = message.components
      .flatMap((row) =>
        row.type === ComponentType.ActionRow ? row.components : []
      )
      .find((component) => component.type === ComponentType.Button);
    if (buttonComponent && buttonComponent.url && buttonComponent.label) {
      createdCommand.button_url = buttonComponent.url;
      createdCommand.button_label = buttonComponent.label;
    }

    const modalId = this.createModalId('ascustom');
    const nameInputId = 'id-name';

    const modal = new ModalBuilder()
      .setTitle('Custom command name')
      .setCustomId(modalId)
      .addComponents([
        new ActionRowBuilder<TextInputBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId(nameInputId)
            .setLabel('Name')
            .setMaxLength(100)
            .setStyle(TextInputStyle.Short)
        ])
      ]);

    await interaction.showModal(modal);

    const modalResponse = await interaction
      .awaitModalSubmit({
        time: 30 * 1000,
        filter: (i) =>
          i.customId === modalId && i.user.id === interaction.user.id
      })
      .catch(() => {});

    if (!modalResponse) return;

    const commandName = modalResponse.fields.getTextInputValue(nameInputId);

    if (config.custom_commands[commandName]) {
      await replyDescriptionEmbed(
        modalResponse,
        `Command '${commandName}' already exists!`,
        MomentumColor.Red,
        true
      );
      return;
    }

    config.custom_commands[commandName] = createdCommand;
    await config.save();

    await replyDescriptionEmbed(
      modalResponse,
      `Command '${commandName}' created from message: ${message.url}`,
      MomentumColor.Blue
    );
  }

  private modalIdCounter = 0;
  private createModalId(name: string) {
    // The modalIdCounter is added in case one user starts multiple waits (i. e. cancels the popup and tries again)
    const id = this.modalIdCounter++;
    if (this.modalIdCounter === Number.MAX_SAFE_INTEGER)
      this.modalIdCounter = 0;

    return `id-modal-${name}-${id}`;
  }
}

export class SayModule implements InteractionModule {
  userFilter = isTrusted;
  commandBuilder = new SlashCommandBuilder()
    .setName('say')
    .setDescription('Executes a custom command')
    .addStringOption((option) =>
      option
        .setName('option')
        .setDescription('Name of the custom command')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('reply')
        .setDescription('Reply to this message')
        .setAutocomplete(true)
    );

  async executeCommand(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('option');
    if (!commandName || !config.custom_commands[commandName]) {
      await replyDescriptionEmbed(
        interaction,
        `Command '${commandName}' doesn't exist!`,
        MomentumColor.Red,
        true
      );
      return;
    }

    const command = config.custom_commands[commandName];
    const { embed, components } = buildCustomCommandResponse(command);

    const replyMessageId = interaction.options.getString('reply');
    if (replyMessageId) {
      embed.setFooter({
        text: `${interaction.user.displayName} used /${interaction.commandName} ${commandName}`,
        iconURL: interaction.user.avatarURL() || undefined
      });

      const message = await interaction.channel?.messages
        .fetch(replyMessageId)
        .catch(() => {});

      if (!message) {
        await replyDescriptionEmbed(
          interaction,
          `Can't find message ${replyMessageId} in this channel.`,
          MomentumColor.Red
        );
        return;
      }

      await (interaction.channel as GuildTextBasedChannel | null)?.send({
        embeds: [embed],
        components,
        reply: { messageReference: replyMessageId }
      });
      await interaction.reply({
        embeds: [
          {
            title: `Replied to message ${replyMessageId}.`,
            description: message.url,
            color: MomentumColor.Blue
          }
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply({ embeds: [embed], components });
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'option') {
      await customCommandAutocomplete(interaction, focused.value);
    }

    if (focused.name === 'reply') {
      const lastMessages = await interaction.channel?.messages
        .fetch()
        .catch(() => null);

      if (!lastMessages) {
        await interaction.respond([]);
        return;
      }

      const messages = [...lastMessages.values()]
        .filter(
          (msg) =>
            !msg.author.bot &&
            msg.system !== true &&
            msg.content.includes(focused.value)
        )
        .slice(0, 25);

      await interaction.respond(
        messages.map((msg) => ({
          name: clipString(
            `${msg.author.displayName}: ${msg.content.replaceAll('\n', ' ')}`,
            100
          ),
          value: msg.id
        }))
      );
    }
  }
}

export class TellModule implements InteractionModule {
  userFilter = isTrusted;
  commandBuilder = new SlashCommandBuilder()
    .setName('tell')
    .setDescription('Executes a custom command (only visible to you)')
    .addStringOption((option) =>
      option
        .setName('option')
        .setDescription('Name of the custom command')
        .setRequired(true)
        .setAutocomplete(true)
    );

  async executeCommand(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('option');
    if (!commandName || !config.custom_commands[commandName]) {
      await replyDescriptionEmbed(
        interaction,
        `Command '${commandName}' doesn't exist!`,
        MomentumColor.Red,
        true
      );
      return;
    }

    const command = config.custom_commands[commandName];
    const { embed, components } = buildCustomCommandResponse(command);

    await interaction.reply({
      embeds: [embed],
      components,
      flags: MessageFlags.Ephemeral
    });
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    await customCommandAutocomplete(interaction, focused.value);
  }
}

async function customCommandAutocomplete(
  interaction: AutocompleteInteraction,
  value: string
) {
  const commands = Object.keys(config.custom_commands);
  const choices = commands
    .filter((key) => key.includes(value))
    .slice(0, 25)
    .sort();

  // Do we really need emojis in custom commands?
  // if (choices.length === 0) {
  //   const emoji = parseEmoji(focusedValue)
  //   if(emoji) choices = findCommand(commands, emoji.?)
  // }

  await interaction.respond(
    choices.map((choice) => ({ name: choice, value: choice }))
  );
}

function clipString(value: string, maxLength: number, trim: string = '...') {
  if (value.length > maxLength) {
    return value.slice(0, maxLength - trim.length) + trim;
  }
  return value;
}

const EditableCommandParams = {
  nullable: [
    'description',
    'button_url',
    'button_label',
    'thumbnail_url',
    'image_url'
  ],
  nonNullable: ['title', 'user']
};
