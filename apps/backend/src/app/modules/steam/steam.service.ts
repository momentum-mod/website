import { HttpService } from '@nestjs/axios';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map } from 'rxjs';
import * as AppTicket from 'steam-appticket';
import { SteamFriendData, SteamUserSummaryData } from './steam.interface';
import { AxiosError } from 'axios';
import * as Sentry from '@sentry/node';

@Injectable()
export class SteamService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {
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
    const getPlayerResponse = await lastValueFrom(
      this.http.get(
        this.config.get('steam.webAPIUrl') +
          '/ISteamUser/GetPlayerSummaries/v2/',
        {
          params: {
            key: this.config.getOrThrow('steam.webAPIKey'),
            steamids: steamID.toString()
          },
          validateStatus: () => true
        }
      )
    );

    if (getPlayerResponse.status === 429 && Sentry.isInitialized()) {
      Sentry.setContext('Steam Response', {
        data: getPlayerResponse.data,
        headers: getPlayerResponse.headers
      });
      Sentry.getCurrentScope().setLevel('log');
      Sentry.captureException('Recieved rate limit from Steam');
    }

    const userSummary = getPlayerResponse.data?.response?.players?.[0];

    if (
      !userSummary ||
      getPlayerResponse.data.response.error ||
      userSummary.personaname === undefined ||
      !userSummary.avatarhash
    )
      throw new ServiceUnavailableException('Failed to get player summary');

    return userSummary;
  }

  /**
   * Handler for ISteamUser/GetFriendList/v1/
   * Throws several different different errors for different failures, which can
   * be left uncaught if you want to throw an error response if this fails.
   */
  async getSteamFriends(steamID: bigint): Promise<SteamFriendData[]> {
    return lastValueFrom(
      this.http
        .get(
          this.config.get('steam.webAPIUrl') + '/ISteamUser/GetFriendList/v1/',
          {
            params: {
              key: this.steamApiKey,
              steamID: steamID,
              relationship: 'friend'
            }
          }
        )
        .pipe(
          map((res) => res?.data?.friendslist?.friends),
          catchError((error: AxiosError) => {
            if (error.response) {
              if (error.response.status === 401) {
                throw new ConflictException(
                  'User has private Steam friends list'
                );
              } else {
                throw new InternalServerErrorException(
                  `ISteamUser/GetFriendList/v1/ returned ${error.status}, which we don't know how to handle!`
                );
              }
            } else {
              throw new ServiceUnavailableException(
                'Steam friends list API did not respond to our request'
              );
            }
          })
        )
    );
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
    const steamResponse = await lastValueFrom(
      this.http
        .get(
          this.config.get('steam.webAPIUrl') +
            '/ISteamUserAuth/AuthenticateUserTicket/v1/',
          {
            params: {
              key: this.config.getOrThrow('steam.webAPIKey'),
              appid: appID,
              ticket: ticket
            }
          }
        )
        .pipe(map((res) => res.data))
        .pipe(
          catchError((_) => {
            throw new ServiceUnavailableException(
              'Failed to authenticate user with Steam'
            );
          })
        )
    );

    if (
      !steamResponse ||
      steamResponse.response.error ||
      steamResponse.response.params.result !== 'OK' ||
      !steamResponse.response.params.steamid
    )
      throw new UnauthorizedException('Invalid user ticket');

    return BigInt(steamResponse.response.params.steamid);
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

  /**
   * Checks whether a Steam account is in "limited" mode i.e. hasn't spent $5
   * or more on Steam, or hasn't even set up a Steam Community profile.
   *
   * Unfortunately Steam Web API doesn't supply this anywhere, so we have to use
   * this messier method of parsing the profile page as XML.
   */
  isAccountLimited(steamID: bigint): Promise<boolean> {
    return lastValueFrom(
      this.http
        .get(`https://steamcommunity.com/profiles/${steamID}?xml=1`)
        .pipe(
          map((res) => {
            const found = this.limitedAccountRegex.exec(res.data);

            // Block doesn't exist, doesn't have a profile setup
            if (!found) {
              return true;
            }

            // We're in a block like <isLimitedAccount>0</isLimitedAccount>
            return found[0] === '1';
          }),
          catchError((_) => {
            throw new ServiceUnavailableException(
              'Failed to get limited status from Steam'
            );
          })
        )
    );
  }
}
