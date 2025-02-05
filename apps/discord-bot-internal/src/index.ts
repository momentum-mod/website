import { Client, Events, GuildMember, Routes } from 'discord.js';
import { config } from './config';
import { replyDescriptionEmbed } from './utils';
import { MomentumColor } from './momentum-color';
import { InteractionModule } from './types/interaction-module';
import { Service } from './types/service';

import { UserTrustService } from './services/trusted';
import { SpyService } from './services/spy';
import { StreamsService } from './services/streams';
import { DailyMessageCountService } from './services/daily-message-count';
const services: Array<typeof Service> = [
  DailyMessageCountService,
  UserTrustService,
  SpyService,
  StreamsService
];

const initializedServices: Map<typeof Service, Service> = new Map();

export function getService<T extends typeof Service>(ctr: T): InstanceType<T> {
  if (!initializedServices.has(ctr))
    throw new Error(
      "Attempt to get service before it's initialization: " + ctr
    );
  return initializedServices.get(ctr)! as InstanceType<T>;
}

import { CustomModule, SayModule } from './interaction-modules/custom';
import { LiveStreamModule } from './interaction-modules/live-stream';
import { TrustedModule } from './interaction-modules/trust';
import { RestartModule } from './interaction-modules/restart';
const interactionModules: Array<new () => InteractionModule> = [
  CustomModule,
  SayModule,
  LiveStreamModule,
  TrustedModule,
  RestartModule
];

// https://github.com/nodejs/undici/issues/1531#issuecomment-1178869993
import { setGlobalDispatcher, Agent } from 'undici';
setGlobalDispatcher(new Agent({ connect: { timeout: 60000 } }));

const client = new Client({ intents: [2 ** 25 - 1] });

const commandMap: Map<string, InteractionModule> = new Map();
const contextMenus: Map<string, InteractionModule> = new Map();

for (const interactionModule of interactionModules) {
  const instance = new interactionModule();

  if (instance.contextMenuBuilder) {
    contextMenus.set(instance.contextMenuBuilder.name, instance);
  }

  commandMap.set(instance.commandBuilder.name, instance);
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  await client.rest.put(
    Routes.applicationGuildCommands(readyClient.user.id, config.guild_id),
    {
      body: [
        ...commandMap.values().map((command) => command.commandBuilder),
        ...contextMenus.values().map((command) => command.contextMenuBuilder)
      ]
    }
  );

  console.log('Commands synced');

  for (const ctr of services) {
    const module = new ctr(client as Client<true>);
    await module.init();
    initializedServices.set(ctr, module);
  }

  console.log('Modules initialized');
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
      console.warn('Unknown command: ' + commandName);
      return;
    }

    if (interaction.isAutocomplete()) {
      if (!interactionModule.autocomplete) {
        console.warn(
          'Tried to autocomplete command with unknown name: ' + commandName
        );
      } else {
        await interactionModule.autocomplete(interaction);
      }
      return;
    }

    if (
      interactionModule.userFilter &&
      (!interaction.member ||
        !interactionModule.userFilter(interaction.member as GuildMember))
    ) {
      if (interaction.member)
        console.debug(
          `User ${interaction.member?.user.username} (${interaction.member?.user.id}) tried running "/${interactionModule.commandBuilder.name}" with user filter failing`
        );

      await replyDescriptionEmbed(
        interaction,
        'Permission denied',
        MomentumColor.Red,
        true
      );
      return;
    }

    if (
      interactionModule.channelFilter &&
      (!interaction.channel ||
        !interactionModule.channelFilter(interaction.channel))
    ) {
      if (interaction.member)
        console.debug(
          `User ${interaction.member?.user.username} (${interaction.member?.user.id}) tried running "/${interactionModule.commandBuilder.name}" with channel filter failing`
        );

      await replyDescriptionEmbed(
        interaction,
        'Permission denied',
        MomentumColor.Red,
        true
      );
      return;
    }

    if (interaction.isContextMenuCommand()) {
      if (!interactionModule.contextMenuHandler) {
        console.warn(
          'Tried to use context menu without context menu handler: ' +
            commandName
        );
      } else {
        await interactionModule.contextMenuHandler(interaction);
      }
      return;
    }

    await interactionModule.executeCommand(interaction);
  } catch (e) {
    console.error(e);
  }
});

client.login(config.bot_token);
