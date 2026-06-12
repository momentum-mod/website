import { Service } from '../types/service';
import { config } from '../config';
import axios from 'axios';
import { CronJob } from 'cron';
import { TextChannel } from 'discord.js';
import * as moment from 'moment-timezone';

export class MeetingNotifcationsService extends Service {
  private meetingsChannel?: TextChannel;

  async init() {
    if (!config.metting_doc_url || !config.meeting_doc_password) return;

    const meetingsChannel = await this.client.channels.fetch(
      config.meeting_channel
    );

    if (!meetingsChannel || !meetingsChannel.isTextBased()) {
      throw new Error(
        `Meetings channel with ID ${config.meeting_channel} not found or is not text-based.`
      );
    }

    this.meetingsChannel = meetingsChannel as TextChannel;

    CronJob.from({
      cronTime: config.metting_doc_schedule,
      onTick: this.onSendMettingDoc.bind(this),
      start: true,
      timeZone: config.meeting_timezone
    });

    CronJob.from({
      cronTime: config.metting_reminder_schedule,
      onTick: this.onSendMettingReminder.bind(this),
      start: true,
      timeZone: config.meeting_timezone
    });
  }

  async onSendMettingDoc() {
    if (!config.metting_doc_url || !config.meeting_doc_password) return;

    const meetingTime = this.getNextMeetingDate();
    const dateTimeFormat = new Intl.DateTimeFormat('en', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
    const [{ value: month }, , { value: day }, , { value: year }] =
      dateTimeFormat.formatToParts(meetingTime);
    const dateString = `${month}/${day}/${year}`;

    const params = new URLSearchParams({
      secret: config.meeting_doc_password,
      date: dateString
    });

    const response = await axios.post(
      config.metting_doc_url + '?' + params.toString(),
      {
        validateStatus: () => true
      }
    );
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Failed to fetch new meeting doc with status ${response.status}: ${response.data}`
      );
    }

    const { url } = response.data;

    if (!url) {
      throw new Error(
        `Failed to fetch meeting doc url with status ${response.status}: ${JSON.stringify(response.data)}`
      );
    }

    const timestamp = this.getNextMeetingTimestamp();
    await this.meetingsChannel!.send(
      `Next week's meeting will be at <t:${timestamp}:t>!\n\n${url}`
    );
  }

  async onSendMettingReminder() {
    if (!config.metting_doc_url || !config.meeting_doc_password) return;

    const timestamp = this.getNextMeetingTimestamp();
    await this.meetingsChannel!.send(
      `Hey <@&${config.team_member_role}>, there's a meeting <t:${timestamp}:R> (<t:${timestamp}:F>)! This is just a courtesy reminder to make sure to fill out the meeting document with what you've been up to! Love you, bye!`
    );
  }

  async shiftMeetingTime() {
    config.meeting_time_shift += 1;

    if (config.meeting_time_shift >= config.meeting_times.length)
      config.meeting_time_shift = 0;

    await config.save();
  }

  getNextMeetingTimestamp() {
    return Math.round(this.getNextMeetingDate().valueOf() / 1000);
  }

  getNextMeetingDate() {
    const epoch = moment.tz('2025-02-01', config.meeting_timezone);

    const date = moment().tz(config.meeting_timezone).weekday(6);

    const currentDay = moment().tz(config.meeting_timezone).isoWeekday();
    if (currentDay >= 6) {
      date.add(1, 'w');
    }

    const weeksSinceEpoch = date.diff(epoch, 'weeks');

    let timeIndex =
      (weeksSinceEpoch % config.meeting_times.length) +
      config.meeting_time_shift;

    if (timeIndex >= config.meeting_times.length)
      timeIndex -= config.meeting_times.length;

    const [hour, minutes] = config.meeting_times[timeIndex];
    date.hour(hour).minutes(minutes);

    return date.toDate();
  }
}
