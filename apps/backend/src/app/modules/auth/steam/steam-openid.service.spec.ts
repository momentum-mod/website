import * as assert from 'node:assert/strict';
import { describe, it, before, mock } from 'node:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { mockDeep } from '@momentum/test-utils';
import { SteamOpenIDService } from './steam-openid.service';

describe('SteamOpenIDService', () => {
  let service: SteamOpenIDService;

  before(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SteamOpenIDService]
    })
      .useMocker((token) => {
        if (token === ConfigService)
          return {
            getOrThrow: mock.fn((key) => {
              switch (key) {
                case 'url.auth':
                  return 'ratemyowl.com';
                case 'steam.webAPIKey':
                  return 'STEAAAAAAAAAAAAAM';
              }
            })
          };
        else return mockDeep(token);
      })
      .compile();

    service = module.get(SteamOpenIDService);
  });

  it('should be defined', () => {
    assert.notStrictEqual(service, undefined);
  });

  describe('getRedirectUrl', () => {
    let openIDAuthenticateSpy: any;

    before(() => {
      openIDAuthenticateSpy = mock.method(
        service['relyingParty'],
        'authenticate'
      );
    });

    it('should return a valid URL', async () => {
      openIDAuthenticateSpy.mock.mockImplementationOnce(
        (_identifier, _immediate, callback) =>
          callback(undefined, 'https://steamcommunity.com/openid/login')
      );
      assert.strictEqual(
        await service.getRedirectUrl(),
        'https://steamcommunity.com/openid/login'
      );
    });

    it('should throw a ServiceUnavailableException is a Steam OpenID referral URL cannot be generated', async () => {
      openIDAuthenticateSpy.mock.mockImplementationOnce(
        (_identifier, _immediate, callback) =>
          callback(
            new Error('its chewsday init'),
            'https://steamcommunity.com/openid/login'
          )
      );
      await assert.rejects(
        service.getRedirectUrl(),
        ServiceUnavailableException
      );
    });
  });

  describe('authenticate', () => {
    let verifyAssertionSpy: any;

    before(() => {
      // Using bracket notation to access a private property here. JS is weird!
      verifyAssertionSpy = mock.method(
        service['relyingParty'],
        'verifyAssertion'
      );
    });

    it('should allow a valid response from Steam', async () => {
      verifyAssertionSpy.mock.mockImplementationOnce((request, callback) =>
        callback(undefined, {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/123'
        })
      );

      assert.strictEqual(
        await service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.claimed_id': 'https://steamcommunity.com/openid/id/123',
            'openid.identity': 'https://steamcommunity.com/openid/id/123'
          }
        } as any),
        123n
      );
    });

    // Note this isn't testing the core part of the security; the real security
    // comes from verifyAssertion, which we're mocking.
    it('should reject requests that cause openID verification to error', async () => {
      verifyAssertionSpy.mock.mockImplementationOnce((request, callback) =>
        callback(new Error('this is not a real user'), {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/123'
        })
      );

      await assert.rejects(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.claimed_id': 'https://steamcommunity.com/openid/id/',
            'openid.identity': 'https://steamcommunity.com/openid/id/'
          }
        } as any),
        UnauthorizedException
      );
    });

    it('should reject requests that do not pass openID authentication', async () => {
      verifyAssertionSpy.mock.mockImplementationOnce((request, callback) =>
        callback(undefined, {
          authenticated: false,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/123'
        })
      );

      await assert.rejects(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.claimed_id': 'https://steamcommunity.com/openid/id/',
            'openid.identity': 'https://steamcommunity.com/openid/id/'
          }
        } as any),
        UnauthorizedException
      );
    });

    it('should reject requests not from Steam', async () => {
      verifyAssertionSpy.mock.mockImplementation((request, callback) =>
        callback(undefined, {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/123'
        })
      );

      await assert.rejects(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://g2a.com/openid/login',
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.claimed_id': 'https://steamcommunity.com/openid/id/123',
            'openid.identity': 'https://steamcommunity.com/openid/id/123'
          }
        } as any),
        UnauthorizedException
      );

      await assert.rejects(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
            'openid.ns': 'http://specs.openid.biz/auth/2.0',
            'openid.claimed_id': 'https://steamcommunity.com/openid/id/123',
            'openid.identity': 'https://steamcommunity.com/openid/id/123'
          }
        } as any),
        UnauthorizedException
      );

      await assert.rejects(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.claimed_id': 'https://steamedhamns.com/openid/id/123',
            'openid.identity': 'https://steamcommunity.com/openid/id/123'
          }
        } as any),
        UnauthorizedException
      );

      await assert.rejects(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.claimed_id': 'https://steamcommunity.com/openid/id/123',
            'openid.identity': 'https://ebay.com/openid/id/123'
          }
        } as any),
        UnauthorizedException
      );

      verifyAssertionSpy.mock.resetCalls();
    });

    it('should reject invalid Steam IDs', async () => {
      verifyAssertionSpy.mock.mockImplementationOnce((request, callback) =>
        callback(undefined, {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/walrus'
        })
      );

      await assert.rejects(
        service.authenticate({
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.claimed_id': 'https://steamcommunity.com/openid/id/walrus',
            'openid.identity': 'https://steamcommunity.com/openid/id/walrus'
          }
        } as any),
        UnauthorizedException
      );
    });
  });
});
