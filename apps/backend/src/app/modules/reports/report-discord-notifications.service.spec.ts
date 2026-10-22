import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mockDeep } from 'jest-mock-extended';
import { WebhookClient } from 'discord.js';
import { Report } from '@momentum/db';
import { ReportCategory, ReportType } from '@momentum/constants';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ReportDiscordNotifications } from './report-discord-notifications.service';

// discord.js only accepts snowflake IDs and 68 character tokens.
const FAKE_WEBHOOK = `https://discord.com/api/webhooks/123456789012345678/${'x'.repeat(68)}`;

describe('ReportDiscordNotifications', () => {
  let db: PrismaMock;
  let send: jest.SpyInstance;

  const report = (overrides: Partial<Report> = {}): Report =>
    ({
      id: 7,
      type: ReportType.PLAYER_REPORT,
      category: ReportCategory.SPAM,
      data: 2n,
      message: '@everyone spamming chat',
      submitterID: 1,
      createdAt: new Date('2026-10-21T00:00:00Z'),
      ...overrides
    }) as Report;

  const createService = async (webhook: string) => {
    const config = {
      getOrThrow: (key: string) =>
        ({
          'discord.reportsWebhook': webhook,
          'url.frontend': 'https://momentum-mod.org'
        })[key]
    };
    const module = await Test.createTestingModule({
      providers: [
        ReportDiscordNotifications,
        PRISMA_MOCK_PROVIDER,
        { provide: ConfigService, useValue: config }
      ]
    })
      .useMocker(mockDeep)
      .compile();

    db = module.get(EXTENDED_PRISMA_SERVICE);
    return module.get(ReportDiscordNotifications);
  };

  beforeEach(() => {
    send = jest
      .spyOn(WebhookClient.prototype, 'send')
      .mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should not send anything when no webhook is configured', async () => {
    const service = await createService('');
    await service.sendReportNotification(report());
    expect(send).not.toHaveBeenCalled();
  });

  it('should not throw on an invalid webhook URL', async () => {
    const service = await createService('not a url');
    await service.sendReportNotification(report());
    expect(send).not.toHaveBeenCalled();
  });

  it('should send a player report with the submitter and target', async () => {
    const service = await createService(FAKE_WEBHOOK);
    db.user.findUnique.mockImplementation((({ where }) =>
      Promise.resolve(
        where.id === 1
          ? { id: 1, alias: 'Reporter', avatar: 'abc' }
          : { id: 2, alias: 'Spam_mer' }
      )) as any);

    await service.sendReportNotification(report());

    expect(send).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          title: 'New Player Report',
          description: '@everyone spamming chat',
          url: 'https://momentum-mod.org/admin/reports',
          author: expect.objectContaining({
            name: 'Reporter',
            url: 'https://momentum-mod.org/profile/1'
          }),
          fields: [
            { name: 'Category', value: 'Spam', inline: true },
            {
              name: 'Reported',
              value: '[Spam\\_mer](https://momentum-mod.org/profile/2)',
              inline: true
            }
          ],
          footer: { text: 'Report #7' }
        })
      ],
      allowedMentions: { parse: [] }
    });
  });

  it('should link the reported map', async () => {
    const service = await createService(FAKE_WEBHOOK);
    db.user.findUnique.mockResolvedValue(null);
    db.mMap.findUnique.mockResolvedValue({ id: 5, name: 'bhop_test' } as any);

    await service.sendReportNotification(
      report({ type: ReportType.MAP_REPORT, data: 5n, message: null })
    );

    const [embed] = send.mock.calls[0][0].embeds;
    expect(embed.title).toBe('New Map Report');
    expect(embed.description).toBe('*No message*');
    expect(embed.fields[1].value).toBe(
      '[bhop\\_test](https://momentum-mod.org/maps/bhop_test)'
    );
  });

  it('should swallow Discord errors', async () => {
    const service = await createService(FAKE_WEBHOOK);
    db.user.findUnique.mockResolvedValue(null);
    send.mockRejectedValue(new Error('Discord is down'));

    await expect(
      service.sendReportNotification(report())
    ).resolves.toBeUndefined();
  });
});
