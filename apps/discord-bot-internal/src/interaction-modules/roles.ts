import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Colors,
  GuildMember,
  SlashCommandBuilder
} from 'discord.js';
import { InteractionModule } from '../types/interaction-module';
import {
  isAdmin,
  isAdminBotChannel,
  isModeratorOrHigher,
  replyDescriptionEmbed
} from '../utils';
import { MomentumColor } from '../momentum-color';
import { config } from '../config';

export class RolesModule implements InteractionModule {
  userFilter = isModeratorOrHigher;
  channelFilter = isAdminBotChannel;
  commandBuilder = new SlashCommandBuilder()
    .setName('role')
    .setDescription('Roles')
    .addSubcommand((builder) =>
      builder
        .setName('add')
        .setDescription('Add a role to a member')
        .addUserOption((option) =>
          option.setName('member').setDescription('member').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('role')
            .setDescription('Role')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('remove')
        .setDescription('Remove a role from a member')
        .addUserOption((option) =>
          option.setName('member').setDescription('member').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('role')
            .setDescription('Role')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('make-giveable')
        .setDescription('Make a role giveable through a command')
        .addStringOption((option) =>
          option
            .setName('role')
            .setDescription('Role')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((builder) =>
      builder
        .setName('make-ungiveable')
        .setDescription('Remove a role from being giveable through a command')
        .addStringOption((option) =>
          option
            .setName('role')
            .setDescription('Role')
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

  private subcommandMap: Record<
    string,
    [
      (i: ChatInputCommandInteraction) => Promise<void>,
      (i: AutocompleteInteraction) => Promise<void>
    ]
  > = {
    add: [this.addRole, this.addRoleAutocomplete],
    remove: [this.removeRole, this.removeRoleAutocomplete],
    'make-giveable': [this.makeGiveable, this.makeGiveableAutocomplete],
    'make-ungiveable': [this.removeGiveable, this.removeGiveableAutocomplete]
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

    await runner[0].bind(this)(interaction);
  }

  async addRole(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember('member');
    const role = interaction.options.getString('role');
    if (!member || !role || !(member instanceof GuildMember)) return;

    if (!config.giveable_roles.includes(role)) {
      await replyDescriptionEmbed(
        interaction,
        `Role <@&${role}> is not giveable.`,
        MomentumColor.Red,
        true
      );
      return;
    }

    try {
      await member.roles.add(role);
      await replyDescriptionEmbed(
        interaction,
        `Added a role <@&${role}> to <@${member.id}>`,
        MomentumColor.Blue
      );
    } catch {
      await replyDescriptionEmbed(
        interaction,
        'Failed to add a role.',
        MomentumColor.Red
      );
    }
  }

  async removeRole(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember('member');
    const role = interaction.options.getString('role');
    if (!member || !role || !(member instanceof GuildMember)) return;

    if (!config.giveable_roles.includes(role)) {
      await replyDescriptionEmbed(
        interaction,
        `Role <@&${role}> is not giveable.`,
        MomentumColor.Red,
        true
      );
      return;
    }

    try {
      await member.roles.remove(role);
      await replyDescriptionEmbed(
        interaction,
        `Removed a role <@&${role}> from <@${member.id}>`,
        MomentumColor.Blue
      );
    } catch {
      await replyDescriptionEmbed(
        interaction,
        'Failed to remove a role.',
        MomentumColor.Red
      );
    }
  }

  async makeGiveable(interaction: ChatInputCommandInteraction) {
    const roleID = interaction.options.getString('role');
    if (!roleID) return;

    const role = await interaction.guild?.roles.fetch(roleID);
    if (!role) return;

    const botHighestRole = interaction.guild?.members.me?.roles.highest;
    if (!botHighestRole) return;

    if (!isAdmin.check(interaction.member as GuildMember)) {
      await replyDescriptionEmbed(
        interaction,
        isAdmin.message,
        MomentumColor.Red,
        true
      );
      return;
    }

    if (role.position >= botHighestRole.position) {
      await replyDescriptionEmbed(
        interaction,
        `Role <@&${role}> is higher then bot's highest role.`,
        MomentumColor.Red
      );
      return;
    }

    config.giveable_roles.push(roleID);
    await config.save();

    await replyDescriptionEmbed(
      interaction,
      `Made a role <@&${roleID}> giveable.`,
      MomentumColor.Blue
    );
  }

  async removeGiveable(interaction: ChatInputCommandInteraction) {
    const roleID = interaction.options.getString('role');
    if (!roleID) return;

    if (!isAdmin.check(interaction.member as GuildMember)) {
      await replyDescriptionEmbed(
        interaction,
        isAdmin.message,
        MomentumColor.Red,
        true
      );
      return;
    }

    config.giveable_roles = config.giveable_roles.filter((id) => id !== roleID);
    await config.save();

    await replyDescriptionEmbed(
      interaction,
      `Made a role <@&${roleID}> not giveable.`,
      Colors.Orange
    );
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const runner = this.subcommandMap[subcommand];

    if (!this.subcommandMap[subcommand]) {
      interaction.respond([]);
      return;
    }

    await runner[1].bind(this)(interaction);
  }

  async addRoleAutocomplete(interaction: AutocompleteInteraction) {
    let memberRoles: string[] = [];

    const memberId = interaction.options.get('member')?.value as string | null;
    if (memberId) {
      const member = await interaction.guild?.members.fetch(memberId);
      if (member) {
        memberRoles = member.roles.cache.keys().toArray() ?? [];
      }
    }

    const roles = await interaction.guild?.roles.fetch();
    if (!roles) return;

    await interaction.respond(
      focusedFilter(
        interaction,
        config.giveable_roles
          .filter((id) => !memberRoles.includes(id))
          .map((id) => ({
            name: roles.get(id)?.name || 'ID: ' + id,
            value: id
          }))
      )
    );
  }

  async removeRoleAutocomplete(interaction: AutocompleteInteraction) {
    let memberRoles: string[] = config.giveable_roles;

    const memberId = interaction.options.get('member')?.value as string | null;
    if (memberId) {
      const member = await interaction.guild?.members.fetch(memberId);
      if (member) {
        memberRoles = member.roles.cache.keys().toArray() ?? [];
      }
    }

    const roles = await interaction.guild?.roles.fetch();
    if (!roles) return;

    await interaction.respond(
      focusedFilter(
        interaction,
        config.giveable_roles
          .filter((id) => memberRoles.includes(id))
          .map((id) => ({
            name: roles.get(id)?.name || 'ID: ' + id,
            value: id
          }))
      )
    );
  }

  async makeGiveableAutocomplete(interaction: AutocompleteInteraction) {
    const roles = await interaction.guild?.roles.fetch();
    if (!roles) return;

    await interaction.respond(
      focusedFilter(
        interaction,
        roles
          .values()
          .toArray()
          .filter(({ id }) => !config.giveable_roles.includes(id))
          .map((r) => ({ name: r.name, value: r.id }))
      )
    );
  }

  async removeGiveableAutocomplete(interaction: AutocompleteInteraction) {
    const roles = await interaction.guild?.roles.fetch();
    if (!roles) return;

    await interaction.respond(
      focusedFilter(
        interaction,
        config.giveable_roles.map((id) => ({
          name: roles.get(id)?.name || 'ID: ' + id,
          value: id
        }))
      )
    );
  }
}

function focusedFilter(
  interaction: AutocompleteInteraction,
  choices: ApplicationCommandOptionChoiceData<string | number>[]
) {
  const focused = interaction.options.getFocused(true);
  return choices
    .filter(({ name }) => name.includes(focused.value))
    .slice(0, 25);
}
