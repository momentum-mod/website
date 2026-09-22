import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  TwitchService,
  TWITCH_STREAMS_CACHE_KEY,
  TWITCH_STREAMS_CACHE_TTL,
  MOMENTUM_MOD_GAME_ID
} from './twitch.service';
import { ValkeyService } from '../valkey/valkey.service';

describe('TwitchService', () => {
  let service: TwitchService;

  const valkeyMock = {
    get: jest.fn(),
    set: jest.fn()
  };

  const configMock = {
    get: jest.fn((key: string) => {
      if (key === 'twitch.clientId') return 'test_client_id';
      if (key === 'twitch.clientSecret') return 'test_client_secret';
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
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchService,
        { provide: ConfigService, useValue: configMock },
        { provide: ValkeyService, useValue: valkeyMock }
      ]
    }).compile();

    service = module.get(TwitchService);
  });

  describe('getStreams', () => {
    it('should return cached streams if present in Valkey', async () => {
      valkeyMock.get.mockResolvedValueOnce(JSON.stringify(mockStreams));
      const fetchSpy = jest.spyOn(global, 'fetch');

      const result = await service.getStreams();

      expect(valkeyMock.get).toHaveBeenCalledWith(TWITCH_STREAMS_CACHE_KEY);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('stream_1');
      expect(result.totalCount).toBe(1);
    });

    it('should fetch from Twitch and cache with TTL when cache is empty', async () => {
      valkeyMock.get.mockResolvedValueOnce(null);

      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock_token' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockStreams })
        } as Response);

      const result = await service.getStreams();

      expect(valkeyMock.get).toHaveBeenCalledWith(TWITCH_STREAMS_CACHE_KEY);
      expect(valkeyMock.set).toHaveBeenCalledWith(
        TWITCH_STREAMS_CACHE_KEY,
        JSON.stringify(mockStreams),
        'EX',
        TWITCH_STREAMS_CACHE_TTL
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('stream_1');
    });

    it('should return empty response if credentials are not configured', async () => {
      valkeyMock.get.mockResolvedValueOnce(null);
      configMock.get.mockReturnValue(null);

      const result = await service.getStreams();

      expect(result.data).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should return empty array if Twitch API request fails', async () => {
      valkeyMock.get.mockResolvedValueOnce(null);
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getStreams();

      expect(result.data).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });
});
