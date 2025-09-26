import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Colors
} from 'discord.js';
import { InteractionModule } from '../types/interaction-module';
import { DailyMessageCountService } from '../services/daily-message-count';
import { getService } from '../services';
import { MomentumColor } from '../momentum-color';
import { config } from '../config';
import {
  isAdminBotChannel,
  isModeratorOrHigher,
  replyDescriptionEmbed,
  timeSpanToPrettyPrint
} from '../utils';

export class TrustedModule implements InteractionModule {
  userFilter = isModeratorOrHigher;
  channelFilter = isAdminBotChannel;
  commandBuilder = new SlashCommandBuilder()
    .setName('trust')
    .setDescription('Media trust commands')
    .addSubcommand((builder) =>
      builder
        .setName('status')
        .setDescription("Checks to see a member's media trust status")
        .addUserOption((option) =>
          option.setName('member').setDescription('Member').setRequired(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('grant')
        .setDescription(
          'Manually trusts a member, if applicable, removing the blacklist'
        )
        .addUserOption((option) =>
          option.setName('member').setDescription('Member').setRequired(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('blacklist')
        .setDescription(
          'Manually blacklist a member, if applicable, removing the trust'
        )
        .addUserOption((option) =>
          option.setName('member').setDescription('Member').setRequired(true)
        )
    );

  private subcommandMap: Record<
    string,
    (i: ChatInputCommandInteraction) => Promise<void>
  > = {
    status: this.checkStatus,
    grant: this.trustMember,
    blacklist: this.blacklistMember
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

  async checkStatus(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember('member') as GuildMember;
    if (!member) return;

    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setTitle('Media Trust Status')
      .setAuthor({
        name: member.user.username,
        iconURL: member.displayAvatarURL()
      })
      .setColor(Colors.Orange);

    const msgCount = getService(DailyMessageCountService);

    const userMessageCounts = msgCount
      .prepare('SELECT * FROM message_count WHERE UserId=?')
      .all(member.id)
      .sort((a, b) => a.Date.getTime() - b.Date.getTime());

    const earliestMessage = userMessageCounts[0];

    if (!earliestMessage) {
      embed.setDescription('No recorded activity');
    } else {
      const totalMessageCount = userMessageCounts.reduce(
        (acc, el) => acc + el.MessageCount,
        0
      );
      const oldestMessageSpan = Date.now() - earliestMessage.Date.getTime();
      const meetsRequirements =
        totalMessageCount > config.media_minimum_messages &&
        Date.now() - earliestMessage.Date.getTime() >
          config.media_minimum_days * 24 * 60 * 60 * 1000;

      embed.addFields(
        {
          name: 'Oldest Message Sent',
          value: timeSpanToPrettyPrint(oldestMessageSpan) + ' ago'
        },
        {
          name: 'Total Messages',
          value: totalMessageCount.toString()
        },
        { name: 'Meets Requirements', value: meetsRequirements.toString() }
      );
    }

    const hasTrustedRole = member.roles.cache.has(config.media_verified_role);
    const hasBlacklistedRole = member.roles.cache.has(
      config.media_blacklisted_role
    );

    if (hasTrustedRole) {
      embed.setColor(MomentumColor.Blue);
    } else if (hasBlacklistedRole) {
      embed.setColor(MomentumColor.Red);
    }

    embed.addFields(
      { name: 'Has Trusted Role', value: hasTrustedRole.toString() },
      { name: 'Has Blacklisted Role', value: hasBlacklistedRole.toString() }
    );

    await interaction.editReply({ embeds: [embed] });
  }

  async trustMember(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember('member') as GuildMember;
    if (!member) return;

    await member.roles.remove(config.media_blacklisted_role);
    await member.roles.add(config.media_verified_role);

    await replyDescriptionEmbed(
      interaction,
      `Trusted ${member}`,
      MomentumColor.Blue
    );
  }

  async blacklistMember(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember('member') as GuildMember;
    if (!member) return;

    await member.roles.remove(config.media_verified_role);
    await member.roles.add(config.media_blacklisted_role);

    await replyDescriptionEmbed(
      interaction,
      `Blacklisted ${member}`,
      MomentumColor.Blue
    );
  }
}
