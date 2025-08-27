import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import * as rxjs from 'rxjs';
import { ChannelType, Client } from 'discord.js';
import { DiscordService } from '../../../../apps/backend/src/app/modules/discord/discord.service';

export async function mockDiscordService(app: NestFastifyApplication) {
  const reviewChannelId = '341002';

  const configService = app.get(ConfigService);
  const getOrThrow = configService.getOrThrow;
  const configMock = jest.spyOn(app.get(ConfigService), 'getOrThrow');
  configMock.mockImplementation((path: string) => {
    if (path.startsWith('discord.')) {
      const parts = path.split('.');
      switch (parts[1]) {
        case 'token':
          return 'A definitely working Discord token.';
        case 'guild':
          return '123';
        case 'contentApprovalChannel':
          return '133001';
        case 'reviewChannel':
          return reviewChannelId;
        case 'statusChannels':
          return parts[2];
      }
    }
    return getOrThrow.bind(configService)(path);
  });

  const discordService: DiscordService = app.get(DiscordService);

  jest
    .spyOn(discordService, 'isEnabled')
    .mockImplementation((): this is Client => true);
  if (!discordService.isEnabled())
    throw new Error('Failed to mock Discord service');
  discordService.rest.setToken(configService.getOrThrow('discord.token'));

  const restGetMock = jest.spyOn(discordService.rest, 'get');
  const restPostMock = jest.spyOn(discordService.rest, 'post');

  const idToTypeMap = {
    '001': ChannelType.GuildText,
    '002': ChannelType.GuildForum,
    '003': ChannelType.PublicThread
  };

  restGetMock.mockImplementation((url: string) => {
    if (url.startsWith('/')) url = url.slice(1);
    const parts = url.split('/');
    return new Promise((res) => {
      switch (parts[0]) {
        case 'channels':
          res({
            id: parts[1],
            name: 'mock-channel',
            type: idToTypeMap[parts[1].slice(-3)] ?? ChannelType.GuildText,
            guild_id: configService.getOrThrow('discord.guild'),
            flags: 0
          });
          break;
        case 'guilds':
          res({ id: parts[1], name: 'Mock Server' });
          break;
        default:
          console.warn('Not mocked GET request to discord: ' + url);
          res({});
          break;
      }
    });
  });

  const restPostObservable = new rxjs.Subject<void>();
  restPostMock.mockImplementation((url: string) => {
    if (url.startsWith('/')) url = url.slice(1);
    const parts = url.split('/');
    return new Promise((res) => {
      if (
        parts.length === 3 &&
        parts[0] === 'channels' &&
        parts[2] === 'messages'
      ) {
        res({
          id: '54321',
          type: 0,
          channel_id: parts[1],
          content: 'Look, a rope!'
        });
      } else if (
        parts.length === 3 &&
        parts[0] === 'channels' &&
        parts[2] === 'threads'
      ) {
        res({
          id: '9121003',
          name: 'Yarn',
          type: ChannelType.PublicThread,
          guild_id: configService.getOrThrow('discord.guild'),
          flags: 0
        });
      } else {
        console.warn('Not mocked POST request to discord: ' + url);
        res({});
      }
      restPostObservable.next();
    });
  });

  await discordService.guilds.fetch(configService.getOrThrow('discord.guild'));

  return { restPostMock, restPostObservable };
}
