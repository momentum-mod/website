import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import openid from 'openid';
import { FastifyRequest } from 'fastify';
import { SteamService } from '../../steam/steam.service';
import { SteamUserSummaryData } from '../../steam/steam.interface';

/**
 * Handles OpenID calls to Steam. Unfortunately, Steam still uses OpenID 2.0
 * because Valve are fucking luddites, so we have to use an old library for it,
 * which uses a pretty archaic callback approach.
 *
 * Heavily based on https://github.com/LeeviHalme/node-steam-openid and https://github.com/liamcurry/passport-steam
 */
@Injectable()
export class SteamOpenIDService {
  private readonly relyingParty: openid.RelyingParty;

  constructor(
    private readonly config: ConfigService,
    private readonly steam: SteamService
  ) {
    const authUrl = `${this.config.get('url')}/auth`;
    const apiKey = this.config.get('steam.webAPIKey');

    this.relyingParty = new openid.RelyingParty(
      `${authUrl}/web/return`,
      authUrl,
      apiKey,
      true,
      []
    );
  }

  async getRedirectUrl(): Promise<string> {
    return new Promise((resolve) => {
      this.relyingParty.authenticate(
        'https://steamcommunity.com/openid',
        false,
        (error: unknown, authUrl: string) => {
          if (error || !authUrl)
            throw new ServiceUnavailableException(
              'Could not start Steam authenication session'
            );

          resolve(authUrl);
        }
      );
    });
  }

  async authenticate(request: FastifyRequest): Promise<SteamUserSummaryData> {
    return new Promise((resolve) =>
      this.relyingParty.verifyAssertion(
        request,
        (
          error: openid.OpenIdError,
          result: { authenticated: boolean; claimedIdentifier?: string }
        ) => {
          if (error || !result || !result.authenticated)
            throw new UnauthorizedException(
              'Failed to authenticate user with Steam'
            );

          const query = request.query;
          if (
            query['openid.op_endpoint'] !==
              'https://steamcommunity.com/openid/login' ||
            query['openid.ns'] !== 'http://specs.openid.net/auth/2.0' ||
            ![
              result.claimedIdentifier,
              query['openid.claimed_id'],
              query['openid.identity']
            ].every((x) =>
              /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/.test(x)
            )
          )
            throw new UnauthorizedException('Claimed identity is invalid');

          const steamID = BigInt(
            result.claimedIdentifier.replace(
              'https://steamcommunity.com/openid/id/',
              ''
            )
          );

          return this.steam
            .getSteamUserSummaryData(steamID)
            .then((data) => resolve(data));
        }
      )
    );
  }
}
