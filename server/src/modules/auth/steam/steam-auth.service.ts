import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { appConfig } from '../../../../config/config';
import { lastValueFrom, map } from 'rxjs';
import * as AppTicket from 'steam-appticket';
import { UsersService } from '../../users/users.service';

@Injectable()
export class SteamAuthService {
    constructor(private readonly userService: UsersService, private readonly http: HttpService) {}

    //#region Public
    async ValidateFromInGame(userTicketRaw: any, steamIDToVerify: string): Promise<User> {
        const userTicket = Buffer.from(userTicketRaw, 'utf8').toString('hex');

        if (!userTicket && !steamIDToVerify) {
            throw new HttpException('Bad Request', 400);
        }

        if (appConfig.steam.useSteamTicketLibrary) {
            Logger.log('local libary');
            return await this.verifyUserTicketLocalLibrary(userTicketRaw, steamIDToVerify);
        } else {
            return await this.verifyUserTicketOnlineAPI(userTicket, steamIDToVerify);
        }
    }

    async ValidateFromSteamWeb(openID: any, profile: any): Promise<User> {
        if (profile._json.profilestate !== 1) {
            throw new HttpException(
                'We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!',
                400
            );
        }

        const user = await this.userService.FindOrCreateFromWeb(openID);

        if (!user) {
            throw new HttpException('Could not get or create user', 500);
        }

        return user;
    }
    //#endregion

    //#region Private
    async verifyUserTicketOnlineAPI(userTicket: string, steamIDToVerify: string) {
        const requestConfig = {
            params: {
                key: appConfig.steam.webAPIKey,
                appid: appConfig.appID,
                ticket: userTicket
            }
        };

        const sres = await lastValueFrom(
            this.http
                .get<any>('https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/', requestConfig)
                .pipe(
                    map((res) => {
                        return res.data;
                    })
                )
        );

        if (!sres) {
            throw new HttpException('Bad Request', 400);
        }

        if (sres.response.error) {
            throw new HttpException('Bad Request', 400);
            // Bad request, and not sending the error object just in case of hidden bans
        }

        if (sres.response.params.result !== 'OK') {
            throw new HttpException(JSON.stringify(sres), 500);
        } // TODO parse the error?

        if (steamIDToVerify !== sres.response.params.steamid) {
            throw new UnauthorizedException();
        } // Generate an error here

        const user = await this.userService.FindOrCreateFromGame(steamIDToVerify);

        if (!user) {
            throw new HttpException('Could not get or create user', 500);
        }

        return user;
    }

    async verifyUserTicketLocalLibrary(userTicketRaw: any, steamIDToVerify: string) {
        let decrypted;
        if (appConfig.steam.useEncryptedTickets) {
            Logger.log('Using encrypted tickets');
            decrypted = AppTicket.parseEncryptedAppTicket(userTicketRaw, appConfig.steam.ticketsSecretKey);
        } else {
            Logger.log('Using non encrypted tickets');
            decrypted = AppTicket.parseAppTicket(userTicketRaw);
        }

        if (!decrypted) {
            Logger.log("Couldn't decrypt");
            throw new HttpException('Bad Request', 400);
        }

        if (
            decrypted.appID !== 669270 &&
            decrypted.appID !== 1802710 &&
            decrypted.steamID.getSteamID64() !== steamIDToVerify
        ) {
            throw new UnauthorizedException();
        }

        const user = await this.userService.FindOrCreateFromGame(steamIDToVerify);

        if (!user) {
            throw new HttpException('Could not get or create user', 500);
        }

        return user;
    }
    //#endregion
}
