import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { wasCalledWith } from '@momentum/test-utils';
import {
  TwitchService,
  TWITCH_STREAMS_CACHE_KEY,
  TWITCH_STREAMS_CACHE_TTL,
  MOMENTUM_MOD_GAME_ID
} from './twitch.service';
import { ValkeyService } from '../valkey/valkey.service';

describe('TwitchService', () => {
  let service: TwitchService;
  let valkeyMock: {
    get: ReturnType<typeof mock.fn<(...args: any[]) => any>>;
    set: ReturnType<typeof mock.fn<(...args: any[]) => any>>;
  };
  let configMock: { get: ReturnType<typeof mock.fn<(key: string) => any>> };
  let fetchMock: ReturnType<typeof mock.fn<(...args: any[]) => any>>;

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
    valkeyMock = {
      get: mock.fn<(...args: any[]) => any>(),
      set: mock.fn<(...args: any[]) => any>()
    };
    configMock = {
      get: mock.fn((key: string) => {
        if (key === 'twitch.clientId') return 'test_client_id';
        if (key === 'twitch.clientSecret') return 'test_client_secret';
        return null;
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchService,
        { provide: ConfigService, useValue: configMock },
        { provide: ValkeyService, useValue: valkeyMock }
      ]
    }).compile();

    service = module.get(TwitchService);

    // Any test that expects a request must queue up the response for it
    fetchMock = mock.fn<(...args: any[]) => any>(() => {
      throw new Error('Unexpected fetch');
    });
    mock.method(globalThis, 'fetch', fetchMock);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('getStreams', () => {
    it('should return cached streams if present in Valkey', async () => {
      valkeyMock.get.mock.mockImplementationOnce(async () =>
        JSON.stringify(mockStreams)
      );

      const result = await service.getStreams();

      assert.ok(wasCalledWith(valkeyMock.get, TWITCH_STREAMS_CACHE_KEY));
      assert.equal(fetchMock.mock.callCount(), 0);
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0].id, 'stream_1');
      assert.equal(result.totalCount, 1);
    });

    it('should fetch from Twitch and cache with TTL when cache is empty', async () => {
      valkeyMock.get.mock.mockImplementationOnce(async () => null);

      fetchMock.mock.mockImplementationOnce(
        async () =>
          ({
            ok: true,
            json: async () => ({ access_token: 'mock_token' })
          }) as Response,
        0
      );
      fetchMock.mock.mockImplementationOnce(
        async () =>
          ({
            ok: true,
            json: async () => ({ data: mockStreams })
          }) as Response,
        1
      );

      const result = await service.getStreams();

      assert.ok(wasCalledWith(valkeyMock.get, TWITCH_STREAMS_CACHE_KEY));
      assert.ok(
        wasCalledWith(
          valkeyMock.set,
          TWITCH_STREAMS_CACHE_KEY,
          JSON.stringify(mockStreams),
          'EX',
          TWITCH_STREAMS_CACHE_TTL
        )
      );
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0].id, 'stream_1');
    });

    it('should return empty response if credentials are not configured', async () => {
      valkeyMock.get.mock.mockImplementationOnce(async () => null);
      configMock.get.mock.mockImplementation(() => null);

      const result = await service.getStreams();

      assert.equal(result.data.length, 0);
      assert.equal(result.totalCount, 0);
    });

    it('should return empty array if Twitch API request fails', async () => {
      valkeyMock.get.mock.mockImplementationOnce(async () => null);
      fetchMock.mock.mockImplementationOnce(async () => {
        throw new Error('Network error');
      }, 0);

      const result = await service.getStreams();

      assert.equal(result.data.length, 0);
      assert.equal(result.totalCount, 0);
    });
  });
});
