import {
  ChatInputCommandInteraction,
  Colors,
  SlashCommandBuilder
} from 'discord.js';
import { InteractionModule } from '../types/interaction-module';
import { StreamsService } from '../services/streams';
import { getService } from '../services';
import { MomentumColor } from '../momentum-color';
import {
  isModeratorOrHigher,
  isAdminBotChannel,
  replyDescriptionEmbed,
  sanitizeMarkdown
} from '../utils';
import { config } from '../config';

export class LiveStreamModule implements InteractionModule {
  userFilter = isModeratorOrHigher;
  channelFilter = isAdminBotChannel;
  commandBuilder = new SlashCommandBuilder()
    .setName('streamban')
    .setDescription('Twitch ban commands')
    .addSubcommand((builder) =>
      builder
        .setName('add')
        .setDescription('Hard ban a twitch user from the livestream channel')
        .addStringOption((option) =>
          option
            .setName('username')
            .setDescription('Username of Twitch user to ban')
            .setRequired(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('remove')
        .setDescription('Remove hard ban of a twitch user')
        .addStringOption((option) =>
          option
            .setName('username')
            .setDescription('Username of Twitch user to unban')
            .setRequired(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('list')
        .setDescription(
          'Get a list of Twitch users hard banned from the livestream channel'
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('softlist')
        .setDescription(
          'Get a list of Twitch users soft banned from the livestream channel'
        )
    );

  private subcommandMap: Record<
    string,
    (i: ChatInputCommandInteraction) => Promise<void>
  > = {
    add: this.addHardBan,
    remove: this.removeHardBan,
    list: this.listHardBans,
    softlist: this.listSoftBans
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

  async addHardBan(interaction: ChatInputCommandInteraction) {
    const twitchUsername = interaction.options.getString('username');
    if (!twitchUsername) return;
    const streams = getService(StreamsService);

    const userId = await streams.twitch
      .getUserId(twitchUsername)
      .catch(() => null);
    if (!userId) {
      await replyDescriptionEmbed(
        interaction,
        'Failed to recieve Twitch user ID or unknown user specified.',
        Colors.Orange
      );
      return;
    }

    config.twitch_user_bans.push(userId);
    await config.save();

    void streams.updateStreams();

    await replyDescriptionEmbed(
      interaction,
      'Banned user with ID ' + userId,
      Colors.Orange
    );
  }

  async removeHardBan(interaction: ChatInputCommandInteraction) {
    const twitchUsername = interaction.options.getString('username');
    if (!twitchUsername) return;
    const streams = getService(StreamsService);

    const userId = await streams.twitch
      .getUserId(twitchUsername)
      .catch(() => null);
    if (!userId) {
      await replyDescriptionEmbed(
        interaction,
        'Failed to recieve Twitch user ID or unknown user specified.',
        Colors.Orange
      );
      return;
    }

    config.twitch_user_bans = config.twitch_user_bans.filter(
      (uid) => uid !== userId
    );
    await config.save();

    void streams.updateStreams();

    await replyDescriptionEmbed(
      interaction,
      'Unbanned user with ID ' + userId,
      Colors.Orange
    );
  }

  async listHardBans(interaction: ChatInputCommandInteraction) {
    const bans = config.twitch_user_bans;
    const streams = getService(StreamsService);
    const usernames = await Promise.all(
      bans.map((uid) =>
        streams.twitch
          .getUser(uid)
          .then((user) => `${user?.display_name || ''}: ${uid}`)
      )
    );

    await interaction.reply({
      embeds: [
        {
          title: 'Twitch Banned IDs',
          description: sanitizeMarkdown(usernames.join('\n')),
          color: MomentumColor.Blue
        }
      ]
    });
  }

  async listSoftBans(interaction: ChatInputCommandInteraction) {
    const streams = getService(StreamsService);
    const usernames = await Promise.all(
      streams.softBans
        .values()
        .map((uid) =>
          streams.twitch
            .getUser(uid)
            .then((user) => `${user?.display_name || ''}: ${uid}`)
        )
    );

    await interaction.reply({
      embeds: [
        {
          title: 'Twitch Soft Banned IDs',
          description: sanitizeMarkdown(usernames.join('\n')),
          color: MomentumColor.Blue
        }
      ]
    });
  }
}
