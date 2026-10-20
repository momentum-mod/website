import * as assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TwitchAPIService } from './twitch-api.service';
import { HttpService } from './http.service';
import { PagedResponse, TwitchStream } from '@momentum/constants';

describe('TwitchAPIService', () => {
  let service: TwitchAPIService;
  let httpMock: { get: ReturnType<typeof mock.fn<(...args: any[]) => any>> };

  beforeEach(() => {
    httpMock = {
      get: mock.fn<(...args: any[]) => any>()
    };

    TestBed.configureTestingModule({
      providers: [
        TwitchAPIService,
        { provide: HttpService, useValue: httpMock }
      ]
    });

    service = TestBed.inject(TwitchAPIService);
  });

  afterEach(() => {
    mock.restoreAll();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    assert.ok(service);
  });

  describe('getGameStreams', () => {
    it('should query backend twitch/streams endpoint', () => {
      const mockResponse: PagedResponse<TwitchStream> = {
        totalCount: 1,
        returnCount: 1,
        data: [
          {
            id: '12345',
            user_id: '67890',
            user_name: 'Speedrunner',
            user_login: 'speedrunner',
            game_id: '492973',
            game_name: 'Momentum Mod',
            type: 'live',
            title: 'Momentum Mod Run',
            tags: [],
            viewer_count: 10,
            started_at: '2026-09-21T00:00:00Z',
            language: 'en',
            thumbnail_url: 'http://example.com/thumb.jpg',
            tag_ids: [],
            is_mature: false
          }
        ]
      };

      httpMock.get.mock.mockImplementation(() => of(mockResponse));

      let result: any;
      service.getGameStreams().subscribe((res) => {
        result = res;
      });

      assert.deepEqual(
        httpMock.get.mock.calls.map(({ arguments: args }) => args),
        [['twitch/streams']]
      );
      assert.deepEqual(result, mockResponse);
    });
  });
});
