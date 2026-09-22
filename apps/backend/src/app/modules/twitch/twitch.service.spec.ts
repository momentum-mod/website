import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  TwitchService,
  TWITCH_STREAMS_CACHE_KEY,
  TWITCH_STREAMS_UPDATE_JOB_NAME,
  MOMENTUM_MOD_GAME_ID
} from './twitch.service';
import { ValkeyService } from '../valkey/valkey.service';
import * as clustered from '../../../clustered';

describe('TwitchService', () => {
  let service: TwitchService;
  let module: TestingModule;
  let schedulerRegistry: SchedulerRegistry;

  const httpMock = {
    post: jest.fn(),
    get: jest.fn()
  };

  const valkeyMock = {
    get: jest.fn(),
    set: jest.fn()
  };

  const configMock = {
    get: jest.fn((key: string) => {
      if (key === 'twitch.clientId') return 'test_client_id';
      if (key === 'twitch.clientSecret') return 'test_client_secret';
      if (key === 'twitch.streamsUpdateSchedule') return '*/5 * * * *';
      return null;
    })
  };

  const mockStreams = [
    {
      id: 'stream_1',
      user_id: 'user_1',
      user_login: 'speedrunner',
      user_name: 'SpeedRunner',
      game_id: MOMENTUM_MOD_GAME_ID,
      game_name: 'Momentum Mod',
      type: 'live',
      title: 'WR Grind',
      tags: ['Speedrun'],
      viewer_count: 42,
      started_at: '2026-09-21T20:00:00Z',
      language: 'en',
      thumbnail_url: 'https://example.com/thumb.jpg',
      tag_ids: [],
      is_mature: false
    }
  ];

  beforeEach(async () => {
    jest.resetAllMocks();

    configMock.get.mockImplementation((key: string) => {
      if (key === 'twitch.clientId') return 'test_client_id';
      if (key === 'twitch.clientSecret') return 'test_client_secret';
      if (key === 'twitch.streamsUpdateSchedule') return '*/5 * * * *';
      return null;
    });

    module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        TwitchService,
        { provide: HttpService, useValue: httpMock },
        { provide: ConfigService, useValue: configMock },
        { provide: ValkeyService, useValue: valkeyMock }
      ]
    }).compile();

    service = module.get(TwitchService);
    schedulerRegistry = module.get(SchedulerRegistry);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (schedulerRegistry.doesExist('cron', TWITCH_STREAMS_UPDATE_JOB_NAME)) {
      schedulerRegistry.deleteCronJob(TWITCH_STREAMS_UPDATE_JOB_NAME);
    }
    await module.close();
  });

  describe('onModuleInit', () => {
    it('should not schedule update if not primary worker', async () => {
      jest.spyOn(clustered, 'isFirstWorker').mockReturnValueOnce(false);

      await service.onModuleInit();

      expect(valkeyMock.get).not.toHaveBeenCalled();
      expect(
        schedulerRegistry.doesExist('cron', TWITCH_STREAMS_UPDATE_JOB_NAME)
      ).toBe(false);
    });

    it('should schedule update and fetch immediately if cache is empty on primary worker', async () => {
      jest.spyOn(clustered, 'isFirstWorker').mockReturnValueOnce(true);
      valkeyMock.get.mockResolvedValueOnce(null);

      httpMock.post.mockReturnValueOnce(
        of({ data: { access_token: 'test_token' } } as AxiosResponse)
      );
      httpMock.get.mockReturnValueOnce(
        of({ data: { data: mockStreams } } as AxiosResponse)
      );

      await service.onModuleInit();

      expect(valkeyMock.get).toHaveBeenCalledWith(TWITCH_STREAMS_CACHE_KEY);
      expect(valkeyMock.set).toHaveBeenCalledWith(
        TWITCH_STREAMS_CACHE_KEY,
        JSON.stringify(mockStreams)
      );
      expect(
        schedulerRegistry.doesExist('cron', TWITCH_STREAMS_UPDATE_JOB_NAME)
      ).toBe(true);
    });

    it('should not register cron if credentials are missing', async () => {
      jest.spyOn(clustered, 'isFirstWorker').mockReturnValueOnce(true);
      configMock.get.mockReturnValueOnce(null);

      await service.onModuleInit();

      expect(
        schedulerRegistry.doesExist('cron', TWITCH_STREAMS_UPDATE_JOB_NAME)
      ).toBe(false);
    });
  });

  describe('updateStreams', () => {
    it('should authenticate and cache fetched streams in valkey', async () => {
      httpMock.post.mockReturnValueOnce(
        of({ data: { access_token: 'test_token' } } as AxiosResponse)
      );
      httpMock.get.mockReturnValueOnce(
        of({ data: { data: mockStreams } } as AxiosResponse)
      );

      await service.updateStreams();

      expect(httpMock.post).toHaveBeenCalledWith(
        'https://id.twitch.tv/oauth2/token',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            grant_type: 'client_credentials'
          })
        })
      );

      expect(httpMock.get).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/streams',
        expect.objectContaining({
          params: { game_id: MOMENTUM_MOD_GAME_ID },
          headers: {
            'Client-ID': 'test_client_id',
            Authorization: 'Bearer test_token'
          }
        })
      );

      expect(valkeyMock.set).toHaveBeenCalledWith(
        TWITCH_STREAMS_CACHE_KEY,
        JSON.stringify(mockStreams)
      );
    });

    it('should gracefully handle HTTP errors without crashing', async () => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => new Error('Twitch API down'))
      );

      await expect(service.updateStreams()).resolves.not.toThrow();
      expect(valkeyMock.set).not.toHaveBeenCalled();
    });
  });

  describe('getStreams', () => {
    it('should return cached streams from Valkey', async () => {
      valkeyMock.get.mockResolvedValueOnce(JSON.stringify(mockStreams));

      const result = await service.getStreams();

      expect(result.totalCount).toBe(1);
      expect(result.returnCount).toBe(1);
      expect(result.data[0].id).toBe('stream_1');
      expect(httpMock.post).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not in Valkey', async () => {
      valkeyMock.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(mockStreams));

      httpMock.post.mockReturnValueOnce(
        of({ data: { access_token: 'test_token' } } as AxiosResponse)
      );
      httpMock.get.mockReturnValueOnce(
        of({ data: { data: mockStreams } } as AxiosResponse)
      );

      const result = await service.getStreams();

      expect(result.totalCount).toBe(1);
      expect(result.data[0].id).toBe('stream_1');
      expect(valkeyMock.set).toHaveBeenCalled();
    });

    it('should return empty paged response if no streams and no cache', async () => {
      valkeyMock.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      httpMock.post.mockReturnValueOnce(
        throwError(() => new Error('Network error'))
      );

      const result = await service.getStreams();

      expect(result.totalCount).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
