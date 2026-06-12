import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { InteractionModule } from '../types/interaction-module';
import { MomentumColor } from '../momentum-color';
import { config } from '../config';
import { isTeamMember, replyDescriptionEmbed } from '../utils';
import { getService } from '../services';
import { MeetingNotifcationsService } from '../services/metting-notifications';

export class ShiftModule implements InteractionModule {
  userFilter = isTeamMember;
  commandBuilder = new SlashCommandBuilder()
    .setName('shift')
    .setDescription('Shift meeting time');

  async executeCommand(interaction: ChatInputCommandInteraction) {
    if (!config.metting_doc_url || !config.meeting_doc_password) {
      await replyDescriptionEmbed(
        interaction,
        'Meetings are not configured.',
        MomentumColor.Red,
        true
      );
      return;
    }

    const meetingNotifications = getService(MeetingNotifcationsService);

    await meetingNotifications.shiftMeetingTime();
    const timestamp = meetingNotifications.getNextMeetingTimestamp();

    await replyDescriptionEmbed(
      interaction,
      `Next week's meeting will be at <t:${timestamp}:t>.`,
      MomentumColor.Blue
    );
  }
}
