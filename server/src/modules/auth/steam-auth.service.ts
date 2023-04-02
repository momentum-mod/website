import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UsersRepoService } from '../repo/users-repo.service';
import { ConfigService } from '@nestjs/config';
import { SteamService } from '@modules/steam/steam.service';
import { SteamUserSummaryData } from '@modules/steam/steam.interface';

@Injectable()
export class SteamAuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly userRepo: UsersRepoService,
        private readonly config: ConfigService,
        private readonly steamService: SteamService
    ) {}

    //#region Public

    async validateFromInGame(steamID: string, userTicket: Buffer, appID?: number): Promise<User> {
        if (!steamID) throw new BadRequestException('Missing SteamID. Should be a Steam ID 64 (decimal).');

        if (!userTicket || !Buffer.isBuffer(userTicket) || userTicket.length === 0)
            throw new BadRequestException('Missing user ticket. Should be a raw octet-stream buffer.');

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

    private async verifyUserTicketOnlineAPI(userTicket: string, steamIDToVerify: string, appID: number): Promise<User> {
        const steamID = await this.steamService.tryAuthenticateUserTicketOnline(userTicket, appID);

        if (steamIDToVerify !== steamID) throw new UnauthorizedException('Invalid SteamID');

        const user = await this.userService.findOrCreateFromGame(steamIDToVerify);

        if (!user) throw new InternalServerErrorException('Could not get or create user');

        return user;
    }

    private async verifyUserTicketLocalLibrary(userTicketRaw: Buffer, steamIDToVerify: string): Promise<User> {
        // Note: This hasn't been tested yet! Needs a secret that only Goc has access to.
        const { steamID, appID } = this.steamService.tryAuthenticateUserTicketLocal(userTicketRaw);

        if (!this.config.get('appIDs').includes(appID) || steamID !== steamIDToVerify)
            throw new UnauthorizedException('Invalid user ticket');

        const user = await this.userService.findOrCreateFromGame(steamID);

        if (!user) throw new InternalServerErrorException('Could not get or create user');

        return user;
    }

    //#endregion
}
