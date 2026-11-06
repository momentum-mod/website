import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SteamService } from './steam.service';

describe('SteamService', () => {
  let service: SteamService;
  let responses: Array<{ text: () => Promise<string>; json: () => unknown }>;

  // Each call to fetch gets the next response queued here, in order
  const setFetchMockResponse = (data: string | object) => {
    responses.push({
      text: () => Promise.resolve(data.toString()),
      json: () => Promise.resolve(data)
    });
  };

  beforeEach(async () => {
    responses = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteamService,
        {
          provide: ConfigService,
          useValue: {
            get: mock.fn<(...args: any[]) => any>(),
            getOrThrow: mock.fn(() => 'whatever')
          }
        }
      ]
    }).compile();

    mock.method(globalThis, 'fetch', () => Promise.resolve(responses.shift()));

    service = module.get(SteamService);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('tryAuthenticateUserTicketOnline', () => {
    it('should return the SteamID for a valid ticket', async () => {
      setFetchMockResponse({
        response: { params: { result: 'OK', steamid: '76561198039308694' } }
      });

      const result = await service.tryAuthenticateUserTicketOnline('ticket', 1);

      assert.strictEqual(result, 76561198039308694n);
    });

    it('should throw an UnauthorizedException for a rejected ticket', async () => {
      setFetchMockResponse({
        response: { error: { errorcode: 3, errordesc: 'Invalid parameter' } }
      });

      await assert.rejects(
        service.tryAuthenticateUserTicketOnline('ticket', 1),
        UnauthorizedException
      );
    });

    it('should throw a ServiceUnavailableException for an unparseable response', async () => {
      responses.push({
        text: () => Promise.resolve('<html>Forbidden</html>'),
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      });

      await assert.rejects(
        service.tryAuthenticateUserTicketOnline('ticket', 1),
        ServiceUnavailableException
      );
    });
  });

  describe('isAccountLimited', () => {
    it('should return false for an unlimited account', async () => {
      setFetchMockResponse({ response: { player_level: 34 } });
      const result = await service.isAccountLimited(76561198039308694n);

      assert.strictEqual(result, false);
    });

    it('should return true for a limited account', async () => {
      setFetchMockResponse({ response: { player_level: 0 } });

      const result = await service.isAccountLimited(76561198039308694n);

      assert.strictEqual(result, true);
    });

    describe('should fallback to steamcommunity logic', () => {
      beforeEach(() => {
        setFetchMockResponse({ response: {} });
      });

      it('should return false for an unlimited account', async () => {
        const unlimitedXml = `
        <profile>
          <steamID64>76561198039308694</steamID64>
          <isLimitedAccount>0</isLimitedAccount>
          <otherData>doesn't matter</otherData>
        </profile>
      `;

        setFetchMockResponse(unlimitedXml);

        const result = await service.isAccountLimited(76561198039308694n);

        assert.strictEqual(result, false);
      });

      it('should return true for a limited account', async () => {
        const limitedXml = `
        <profile>
          <steamID64>76561198039308694</steamID64>
          <isLimitedAccount>1</isLimitedAccount>
          <otherData>doesn't matter</otherData>
        </profile>
      `;

        setFetchMockResponse(limitedXml);

        const result = await service.isAccountLimited(76561198039308694n);

        assert.strictEqual(result, true);
      });

      it('should return true for an account without a profile setup', async () => {
        const noProfileXml = `
        <profile>
          <steamID64>76561199511085543</steamID64>
          <privacyMessage>
            This user has not yet set up their Steam Community profile.
          </privacyMessage>
        </profile>
      `;

        setFetchMockResponse(noProfileXml);

        const result = await service.isAccountLimited(76561199511085543n);

        assert.strictEqual(result, true);
      });
    });
  });
});
