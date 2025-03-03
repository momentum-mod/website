import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Colors
} from 'discord.js';
import { InteractionModule } from '../types/interaction-module';
import { isAdmin, isAdminBotChannel, replyDescriptionEmbed } from '../utils';
import { logger } from '../logger';

export class RestartModule implements InteractionModule {
  userFilter = isAdmin;
  channelFilter = isAdminBotChannel;
  commandBuilder = new SlashCommandBuilder()
    .setName('forcerestart')
    .setDescription(
      'Forces the bot to exit the process, and have Docker auto-restart it'
    );

  async executeCommand(interaction: ChatInputCommandInteraction) {
    logger.warn(
      `User ${interaction.member?.user.username} (${interaction.member?.user.id}) forced the bot to restart`
    );
    await replyDescriptionEmbed(interaction, 'Restarting ...', Colors.Orange);

    process.exit(0);
  }
}
