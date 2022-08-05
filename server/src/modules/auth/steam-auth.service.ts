import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    forwardRef,
    HttpException,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import { User } from '@prisma/client';
import { appConfig } from '../../../config/config';
import { lastValueFrom, map } from 'rxjs';
import * as AppTicket from 'steam-appticket';
import { UsersService } from '../users/users.service';

@Injectable()
export class SteamAuthService {
    constructor(
        @Inject(forwardRef(() => UsersService)) private readonly userService: UsersService,
        private readonly http: HttpService
    ) {}

    //#region Public

    async skipValidation(steamID: string) {
        const response = await this.userService.getBySteamID(steamID);

        if (!response) throw new UnauthorizedException('User not found for Steam login');

        return response;
    }

    async validateFromInGame(steamID: string, userTicketRaw: Buffer): Promise<User> {
        if (!userTicketRaw) throw new BadRequestException('Missing userTicket');

        if (!Buffer.isBuffer(userTicketRaw)) throw new BadRequestException('Invalid userTicket');

        const userTicket: string = userTicketRaw.toString('hex');

        if (appConfig.steam.useSteamTicketLibrary && false) {
            Logger.log('local libary');
            return await this.verifyUserTicketLocalLibrary(userTicketRaw, steamID);
        } else {
            return await this.verifyUserTicketOnlineAPI(userTicket, steamID);
        }
    }

    async validateFromSteamWeb(openID: any, profile: any): Promise<User> {
        if (profile._json.profilestate !== 1) {
            throw new HttpException(
                'We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!',
                400
            );
        }

        const user = await this.userService.findOrCreateFromWeb(openID);

        if (!user) {
            throw new HttpException('Could not get or create user', 500);
        }

        return user;
    }

    //#endregion

    //#region Private

    private async verifyUserTicketOnlineAPI(userTicket: string, steamIDToVerify: string) {
        const requestConfig = {
            params: {
                key: appConfig.steam.webAPIKey,
                appid: appConfig.appID,
                ticket: userTicket
            }
        };

        const steamResponse = await lastValueFrom(
            this.http
                .get<any>('https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/', requestConfig)
                .pipe(map((res) => res.data))
        );

        // Bad request, and not sending the error object just in case of hidden bans
        if (!steamResponse || steamResponse.response.error)
            throw new BadRequestException(JSON.stringify(steamResponse));

        // TODO parse the error?
        if (steamResponse.response.params.result !== 'OK')
            throw new InternalServerErrorException(JSON.stringify(steamResponse));

        if (steamIDToVerify !== steamResponse.response.params.steamid)
            throw new UnauthorizedException('Invalid SteamID');

        const user = await this.userService.findOrCreateFromGame(steamIDToVerify);

        if (!user) throw new InternalServerErrorException('Could not get or create user');

        return user;
    }

    private async verifyUserTicketLocalLibrary(userTicketRaw: any, steamIDToVerify: string) {
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

        const user = await this.userService.findOrCreateFromGame(steamIDToVerify);

        if (!user) {
            throw new HttpException('Could not get or create user', 500);
        }

        return user;
    }

    //#endregion
}
