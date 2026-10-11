import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AppTicket from 'steam-appticket';
import { SteamFriendData, SteamUserSummaryData } from './steam.interface';
import * as Sentry from '@sentry/node';

@Injectable()
export class SteamService {
  constructor(private readonly config: ConfigService) {
    this.steamApiKey = this.config.getOrThrow('steam.webAPIKey');
    this.steamTicketsSecretKey = this.config.getOrThrow(
      'steam.ticketsSecretKey'
    );
  }

  private readonly steamApiKey: string;
  private readonly steamTicketsSecretKey: string;

  /**
   * Handler for ISteamUser/GetPlayerSummaries/v2/
   */
  async getSteamUserSummaryData(
    steamID: bigint
  ): Promise<SteamUserSummaryData> {
    try {
      const getPlayerResponse = await fetch(
        this.config.get('steam.webAPIUrl') +
          '/ISteamUser/GetPlayerSummaries/v2/?' +
          new URLSearchParams({
            key: this.config.getOrThrow('steam.webAPIKey'),
            steamids: steamID.toString()
          })
      );

      await this.reportOnRateLimit(getPlayerResponse);

      const getPlayerData = await getPlayerResponse.json();
      const userSummary = getPlayerData.response?.players?.[0];

      if (
        !userSummary ||
        getPlayerData.response.error ||
        userSummary.personaname === undefined ||
        !userSummary.avatarhash
      ) {
        if (Sentry.isInitialized()) {
          Sentry.setContext('Steam Response', {
            data: userSummary,
            headers: getPlayerResponse.headers
          });
          Sentry.getCurrentScope().setLevel('log');
          Sentry.captureException('Invalid data on user summary');
        }

        throw new Error('Invalid data on user summary');
      }

      return userSummary;
    } catch {
      throw new ServiceUnavailableException('Failed to get player summary');
    }
  }

  /**
   * Handler for ISteamUser/GetFriendList/v1/
   * Throws several different different errors for different failures, which can
   * be left uncaught if you want to throw an error response if this fails.
   */
  async getSteamFriends(steamID: bigint): Promise<SteamFriendData[]> {
    try {
      const response = await fetch(
        this.config.get('steam.webAPIUrl') +
          '/ISteamUser/GetFriendList/v1/?' +
          new URLSearchParams({
            key: this.steamApiKey,
            steamID: steamID.toString(),
            relationship: 'friend'
          })
      );

      await this.reportOnRateLimit(response);

      if (response.status === 401) {
        throw new ConflictException('User has private Steam friends list');
      }

      const data = await response.json();

      return data?.friendslist?.friends;
    } catch {
      throw new ServiceUnavailableException(
        'Failed to fetch player steam friends'
      );
    }
  }

  /**
   * Handler for ISteamUserAuth/AuthenticateUserTicket/v1/
   * Try to decrypt a player's app ticket from ingame using the Steam API.
   * Returns SteamID if successful, throws otherwise.
   * @returns SteamID
   */
  async tryAuthenticateUserTicketOnline(
    ticket: string,
    appID: number
  ): Promise<bigint> {
    try {
      const steamResponse = await fetch(
        this.config.get('steam.webAPIUrl') +
          '/ISteamUserAuth/AuthenticateUserTicket/v1/?' +
          new URLSearchParams({
            key: this.config.getOrThrow('steam.webAPIKey'),
            appid: appID.toString(),
            ticket: ticket
          })
      );

      await this.reportOnRateLimit(steamResponse);

      const steamData = await steamResponse.json();

      if (
        !steamData ||
        steamData.response.error ||
        steamData.response.params.result !== 'OK' ||
        !steamData.response.params.steamid
      )
        throw new UnauthorizedException('Invalid user ticket');

      return BigInt(steamData.params.steamid);
    } catch {
      throw new ServiceUnavailableException(
        'Failed to authenticate user with Steam'
      );
    }
  }

  /**
   * Try to decrypt a player's app ticket from ingame using the steam-appticket
   * library. Returns SteamID if successful, throws otherwise.
   *
   * Please note, the steam.ticketsSecretKey key is only available to app
   * publishers on Steam, so Momentum's will never be available to developers.
   * For development using live Steam services, use the online API.
   */
  tryAuthenticateUserTicketLocal(ticket: Buffer): {
    steamID: bigint;
    appID: number;
  } {
    const decrypted = AppTicket.parseEncryptedAppTicket(
      ticket,
      this.steamTicketsSecretKey
    );

    if (decrypted) {
      return {
        steamID: decrypted.steamID.getBigIntID(),
        appID: decrypted.appID
      };
    } else {
      throw new UnauthorizedException('Invalid user ticket');
    }
  }

  private readonly limitedAccountRegex = new RegExp(
    /(?<=<isLimitedAccount>)\d(?=<\/isLimitedAccount>)/
  );

  async fetchAccountCommunityData(steamID: bigint): Promise<string> {
    try {
      const response = await fetch(
        `https://steamcommunity.com/profiles/${steamID}?xml=1`
      );

      await this.reportOnRateLimit(response);

      return await response.text();
    } catch {
      throw new ServiceUnavailableException(
        'Failed to get limited status from Steam'
      );
    }
  }

  /**
   * Checks whether a Steam account is in "limited" mode i.e. hasn't spent $5
   * or more on Steam, or hasn't even set up a Steam Community profile.
   *
   * Unfortunately Steam Web API doesn't supply this anywhere, so we have to use
   * this messier method of parsing the profile page as XML.
   */
  async isAccountLimited(steamID: bigint): Promise<boolean> {
    try {
      const steamResponse = await fetch(
        this.config.get('steam.webAPIUrl') +
          '/IPlayerService/GetSteamLevel/v1/?' +
          new URLSearchParams({
            key: this.config.getOrThrow('steam.webAPIKey'),
            steamid: steamID.toString()
          })
      );

      await this.reportOnRateLimit(steamResponse);

      const steamData = await steamResponse.json();

      if (
        !steamData.response.player_level &&
        steamData.response.player_level !== 0
      ) {
        // Fallback to steamcommunity data
        const communityData = await this.fetchAccountCommunityData(steamID);
        const found = this.limitedAccountRegex.exec(communityData);

        // Block doesn't exist, doesn't have a profile setup
        if (!found) {
          return true;
        }

        // We're in a block like <isLimitedAccount>0</isLimitedAccount>
        return found[0] === '1';
      }

      return steamData.response.player_level === 0;
    } catch {
      throw new ServiceUnavailableException(
        'Failed to get player level from Steam'
      );
    }
  }

  private async reportOnRateLimit(resp: Response) {
    if (resp.status === 429) {
      if (Sentry.isInitialized()) {
        Sentry.setContext('Steam Response', {
          data: await resp.text(),
          headers: resp.headers
        });
        Sentry.getCurrentScope().setLevel('log');
        Sentry.captureException('Recieved rate limit from Steam');
      }

      throw new Error('Recieved rate limit from Steam');
    }
  }
}
