import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import {
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { SteamService } from '../../steam/steam.service';
import { SteamOpenIDService } from './steam-openid.service';

describe('SteamOpenIDService', () => {
  let service: SteamOpenIDService, steamService: SteamService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SteamOpenIDService]
    })
      .useMocker((token) => {
        if (token === ConfigService)
          return {
            get: jest.fn((key) => {
              switch (key) {
                case 'url.auth':
                  return 'ratemyowl.com';
                case 'steam.webAPIKey':
                  return 'STEAAAAAAAAAAAAAM';
              }
            })
          };
        else return createMock(token);
      })
      .compile();

    service = module.get(SteamOpenIDService);
    steamService = module.get(SteamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRedirectUrl', () => {
    let openIDAuthenticateSpy: jest.SpyInstance;

    beforeAll(() => {
      openIDAuthenticateSpy = jest.spyOn(
        service['relyingParty'],
        'authenticate'
      );
    });

    it('should return a valid URL', async () => {
      openIDAuthenticateSpy.mockImplementationOnce(
        (_identifier, _immediate, callback) =>
          callback(undefined, 'https://steamcommunity.com/openid/login')
      );
      expect(await service.getRedirectUrl()).toBe(
        'https://steamcommunity.com/openid/login'
      );
    });

    it('should throw a ServiceUnavailableException is a Steam OpenID referral URL cannot be generated', async () => {
      openIDAuthenticateSpy.mockImplementationOnce(
        (_identifier, _immediate, callback) =>
          callback(
            new Error('its chewsday init'),
            'https://steamcommunity.com/openid/login'
          )
      );
      await expect(service.getRedirectUrl()).rejects.toThrow(
        ServiceUnavailableException
      );
    });
  });

  describe('authenticate', () => {
    let verifyAssertionSpy: jest.SpyInstance,
      getSteamUserSummaryDataSpy: jest.SpyInstance;

    beforeAll(() => {
      // Using bracket notation to access a private property here. JS is weird!
      verifyAssertionSpy = jest.spyOn(
        service['relyingParty'],
        'verifyAssertion'
      );
      getSteamUserSummaryDataSpy = jest.spyOn(
        steamService,
        'getSteamUserSummaryData'
      );
    });

    it('should allow a valid response from Steam', async () => {
      verifyAssertionSpy.mockImplementationOnce((request, callback) =>
        callback(undefined, {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/123'
        })
      );

      getSteamUserSummaryDataSpy.mockResolvedValueOnce('cabbage' as any);

      expect(
        await service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login'
          }
        } as any)
      ).toBe('cabbage');
      expect(getSteamUserSummaryDataSpy).toHaveBeenCalledWith(123n);
    });

    // Note this isn't testing the core part of the security; the real security comes from verifyAssertion, which we're mocking.
    it('should reject requests that cause openID verification to error', async () => {
      verifyAssertionSpy.mockImplementationOnce((request, callback) =>
        callback(new Error('this is not a real user'), {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/123'
        })
      );

      await expect(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login'
          }
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject requests that do not pass openID authentication', async () => {
      verifyAssertionSpy.mockImplementationOnce((request, callback) =>
        callback(undefined, {
          authenticated: false,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/123'
        })
      );

      await expect(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login'
          }
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject requests not from Steam', async () => {
      verifyAssertionSpy.mockImplementationOnce((request, callback) =>
        callback(undefined, {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/123'
        })
      );

      getSteamUserSummaryDataSpy.mockResolvedValueOnce('cabbage' as any);

      await expect(
        service.authenticate({
          query: { 'openid.op_endpoint': 'https://g2a.com/openid/login' }
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid Steam IDs', async () => {
      verifyAssertionSpy.mockImplementationOnce((request, callback) =>
        callback(undefined, {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/walrus'
        })
      );

      getSteamUserSummaryDataSpy.mockResolvedValueOnce('cabbage' as any);

      await expect(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login'
          }
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
