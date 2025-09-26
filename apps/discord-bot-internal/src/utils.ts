import {
  Channel,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  MessageFlags,
  ModalSubmitInteraction
} from 'discord.js';
import { config } from './config';

export async function replyDescriptionEmbed(
  interaction:
    | ChatInputCommandInteraction
    | ModalSubmitInteraction
    | ContextMenuCommandInteraction,
  text: string,
  color: number,
  ephemeral: boolean = false
) {
  const replyData: InteractionReplyOptions = {
    embeds: [
      {
        description: text,
        color
      }
    ]
  };

  if (ephemeral) {
    replyData.flags = MessageFlags.Ephemeral;
  }

  await interaction.reply(replyData);
}

export const isModeratorOrHigher = {
  check(member: GuildMember) {
    return member.roles.cache.hasAny(config.moderator_id, config.admin_id);
  },
  message: 'You have to be moderator or higher to use this command.'
};

export const isAdmin = {
  check(member: GuildMember) {
    return member.roles.cache.has(config.admin_id);
  },
  message: 'You have to be admin to use this command.'
};

export const isTrusted = {
  check(member: GuildMember) {
    return member.roles.cache.has(config.media_verified_role);
  },
  message: 'You have to be trusted to use this command.'
};

export const isAdminBotChannel = {
  check(channel: Channel) {
    return channel.id === config.admin_bot_channel;
  },
  message: 'This command is only avaliable in bot config channel.'
};

// Stolen from DSharpPlus
export function sanitizeMarkdown(input: string) {
  return input.replaceAll(/([!"#&()*:<>@[\]_`|~])/g, String.raw`\$1`);
}

export function timeSpanToPrettyPrint(
  totalMilliseconds: number,
  accuracy: number = 3
) {
  if (totalMilliseconds < 1) return 'instantaneously';
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const years = Math.floor(totalDays / 365);

  const days = totalDays - 365 * years;
  const hours = totalHours - 24 * totalDays;
  const minutes = totalMinutes - 60 * totalHours;
  const seconds = totalSeconds - 60 * totalMinutes;
  const millis = totalMilliseconds - 1000 * totalSeconds;

  let res = '';

  if (years > 0) {
    res += `${years} year${years > 1 ? 's' : ''} `;
  }

  if (days > 0) {
    res += `${days} day${days > 1 ? 's' : ''} `;
  }

  if (hours > 0) {
    res += `${hours} hour${hours > 1 ? 's' : ''} `;
  }

  if (minutes > 0) {
    res += `${minutes} minute${minutes > 1 ? 's' : ''} `;
  }

  if (seconds > 0) {
    res += `${seconds} second${seconds > 1 ? 's' : ''} `;
  }

  if (totalSeconds < 1 && millis > 0) {
    res += `${millis} millisecond${millis > 1 ? 's' : ''} `;
  }

  return res
    .split(' ', accuracy * 2)
    .join(' ')
    .trim();
}
