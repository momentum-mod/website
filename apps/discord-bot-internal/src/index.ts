import { Client, Events, GuildMember, Routes } from 'discord.js';
import { Agent } from 'undici';
import { logger } from './logger';
import { config } from './config';
import { replyDescriptionEmbed } from './utils';
import { MomentumColor } from './momentum-color';
import { InteractionModule } from './types/interaction-module';
import { initializeServices } from './services';
import { interactionModules } from './interaction-modules';

const client = new Client({ intents: [2 ** 25 - 1] });

// https://github.com/nodejs/undici/issues/1531#issuecomment-1178869993
client.rest.setAgent(new Agent({ connect: { timeout: 60000 } }));

const commandMap = new Map<string, InteractionModule>();
const contextMenus = new Map<string, InteractionModule>();

for (const interactionModule of interactionModules) {
  const instance = new interactionModule();

  if (instance.contextMenuBuilder) {
    contextMenus.set(instance.contextMenuBuilder.name, instance);
  }

  commandMap.set(instance.commandBuilder.name, instance);
}

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(
    {
      user: readyClient.user
    },
    'Discord client is ready'
  );

  await client.rest.put(
    Routes.applicationGuildCommands(readyClient.user.id, config.guild_id),
    {
      body: [
        ...commandMap.values().map((command) => command.commandBuilder),
        ...contextMenus.values().map((command) => command.contextMenuBuilder)
      ]
    }
  );

  logger.info('Discord commands synchronized');

  await initializeServices(client as Client<true>);
  logger.info('Services initialized');
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (
      !interaction.isChatInputCommand() &&
      !interaction.isContextMenuCommand() &&
      !interaction.isAutocomplete()
    )
      return;

    const commandName = interaction.commandName;
    const interactionModule = interaction.isContextMenuCommand()
      ? contextMenus.get(commandName)
      : commandMap.get(commandName);

    if (!interactionModule) {
      logger.warn('Unknown command: ' + commandName, { interaction });
      return;
    }

    if (interaction.isAutocomplete()) {
      if (!interactionModule.autocomplete) {
        logger.warn(
          'Tried to autocomplete command with unknown name: ' + commandName,
          { interaction }
        );
      } else {
        await interactionModule.autocomplete(interaction);
      }
      return;
    }

    if (
      interactionModule.userFilter &&
      (!interaction.member ||
        !interactionModule.userFilter.check(interaction.member as GuildMember))
    ) {
      if (interaction.member)
        logger.debug(
          `User ${interaction.member?.user.username} (${interaction.member?.user.id}) tried running "/${interactionModule.commandBuilder.name}" with user filter failing`
        );

      await replyDescriptionEmbed(
        interaction,
        interactionModule.userFilter.message,
        MomentumColor.Red,
        true
      );
      return;
    }

    if (
      interactionModule.channelFilter &&
      (!interaction.channel ||
        !interactionModule.channelFilter.check(interaction.channel))
    ) {
      if (interaction.member)
        logger.debug(
          `User ${interaction.member?.user.username} (${interaction.member?.user.id}) tried running "/${interactionModule.commandBuilder.name}" with channel filter failing`
        );

      await replyDescriptionEmbed(
        interaction,
        interactionModule.channelFilter.message,
        MomentumColor.Red,
        true
      );
      return;
    }

    if (interaction.isContextMenuCommand()) {
      if (!interactionModule.contextMenuHandler) {
        logger.warn(
          'Tried to use context menu without context menu handler: ' +
            commandName,
          { interaction }
        );
      } else {
        await interactionModule.contextMenuHandler(interaction);
      }
      return;
    }

    await interactionModule.executeCommand(interaction);
  } catch (error) {
    logger.error({ err: error, interaction }, 'Failed to handle interaction');
  }
});

client.login(config.bot_token);
