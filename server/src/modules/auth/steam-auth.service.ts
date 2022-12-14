import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException
} from '@nestjs/common';
import { User } from '@prisma/client';
import { catchError, concatMap, EMPTY, filter, firstValueFrom, from, map, Observable, take } from 'rxjs';
import * as AppTicket from 'steam-appticket';
import { UsersService } from '../users/users.service';
import { UsersRepoService } from '../repo/users-repo.service';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { SteamUserSummaryData } from '@modules/auth/auth.interfaces';

@Injectable()
export class SteamAuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly userRepo: UsersRepoService,
        private readonly http: HttpService,
        private readonly config: ConfigService
    ) {}

    //#region Public

    async validateFromInGame(steamID: string, userTicket: Buffer, appID?: number): Promise<User> {
        if (!steamID) throw new BadRequestException('Missing SteamID. Should be a Steam ID 64 (decimal).');

        if (!userTicket || !Buffer.isBuffer(userTicket))
            throw new BadRequestException('Missing userTicket. Should be a raw octet-stream buffer.');

        return this.config.get('steam.useSteamTicketLibrary')
            ? await this.verifyUserTicketLocalLibrary(userTicket, steamID)
            : await this.verifyUserTicketOnlineAPI(userTicket.toString('hex'), steamID, appID);
    }

    async validateFromSteamWeb(profile: SteamUserSummaryData): Promise<User> {
        if (profile.profilestate !== 1)
            throw new ForbiddenException(
                'We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!'
            );

        const user = await this.userService.findOrCreateFromWeb(profile);

        if (!user) throw new InternalServerErrorException('Could not get or create user');

        return user;
    }

    //#endregion

    //#region Private

    private tryAuthenicateUserTicket(ticket: string, appID: number): Observable<AxiosResponse | never> {
        return this.http
            .get('https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/', {
                params: {
                    key: this.config.get('steam.webAPIKey'),
                    appid: appID,
                    ticket: ticket
                }
            })
            .pipe(catchError(() => EMPTY));
    }

    private async verifyUserTicketOnlineAPI(
        userTicket: string,
        steamIDToVerify: string,
        appID?: number
    ): Promise<User> {
        const steamResponse =
            appID && !Number.isNaN(appID)
                ? await firstValueFrom(this.tryAuthenicateUserTicket(userTicket, appID))
                : // Silly, but solves if we can't grab Steam ID from client: just query for each app ID sequentially.
                  await firstValueFrom(
                      from(this.config.get('appIDs') as number[]).pipe(
                          concatMap((appID) => this.tryAuthenicateUserTicket(userTicket, appID)),
                          filter((result) => result[0] && result[0].status === 200 && !result[0].data.response.error),
                          take(1),
                          map((res) => res.data)
                      )
                  );

        // Bad request, and not sending the error object just in case of hidden bans
        if (!steamResponse || steamResponse.response.error || steamResponse.response.params.result !== 'OK')
            throw new BadRequestException(`Steam API auth returned error: ${JSON.stringify(steamResponse)}`);

        if (steamIDToVerify !== steamResponse.response.params.steamid)
            throw new UnauthorizedException('Invalid SteamID');

        const user = await this.userService.findOrCreateFromGame(steamIDToVerify);

        if (!user) throw new InternalServerErrorException('Could not get or create user');

        return user;
    }

    private async verifyUserTicketLocalLibrary(userTicketRaw: Buffer, steamIDToVerify: string): Promise<User> {
        // Note: This hasn't been tested yet! Needs a secret that only Goc has access to.
        const decrypted = AppTicket.parseEncryptedAppTicket(userTicketRaw, this.config.get('steam.ticketsSecretKey'));

        if (!decrypted) throw new BadRequestException('Was unable to decrypt app ticket!');

        if (
            !this.config.get('appIDs').includes(decrypted.appID) ||
            decrypted.steamID.getSteamID64() !== steamIDToVerify
        )
            throw new UnauthorizedException();

        const user = await this.userService.findOrCreateFromGame(steamIDToVerify);

        if (!user) throw new InternalServerErrorException('Could not get or create user');

        return user;
    }

    //#endregion
}
