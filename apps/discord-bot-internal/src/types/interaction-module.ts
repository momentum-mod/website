import {
  AutocompleteInteraction,
  Channel,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  ContextMenuCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';

export interface InteractionModule {
  commandBuilder:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder;
  contextMenuBuilder?: ContextMenuCommandBuilder;
  executeCommand(
    interaction: ChatInputCommandInteraction
  ): void | Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction): void | Promise<void>;
  contextMenuHandler?(
    interaction: ContextMenuCommandInteraction
  ): void | Promise<void>;
  userFilter?(member: GuildMember): boolean;
  channelFilter?(channel: Channel): boolean;
}
