import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
    InternalServerErrorException,
    RawBodyRequest,
    UnauthorizedException
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { SteamService } from '@modules/steam/steam.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@modules/users/users.service';

@Injectable()
export class SteamGameGuard implements CanActivate {
    constructor(
        private readonly steamService: SteamService,
        private readonly configService: ConfigService,
        private readonly userService: UsersService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: RawBodyRequest<FastifyRequest> = context.switchToHttp().getRequest();

        if (typeof request.headers['id'] !== 'string')
            throw new BadRequestException('Invalid SteamID. Should be a Steam ID 64 (decimal).');
        const steamID = BigInt(request.headers['id']);

        // With playtest ongoing we want to check we have the right appID for the online Steam API request.
        // The game includes this in user-agent (e.g. `Valve/Steam HTTP Client 1.0 (<appID>)`), dig it out with a regex.
        const appID = Number.parseInt(/(?!=\()\d+(?=\))/.exec(request.headers['user-agent'])?.[0]);

        if (!steamID) throw new BadRequestException('Missing SteamID. Should be a Steam ID 64 (decimal).');

        const userTicket = request.rawBody;

        if (!userTicket || !Buffer.isBuffer(userTicket) || userTicket.length === 0)
            throw new BadRequestException('Missing user ticket. Should be a raw octet-stream buffer.');

        this.configService.get('steam.useSteamTicketLibrary')
            ? this.verifyUserTicketLocalLibrary(userTicket, steamID)
            : await this.verifyUserTicketOnlineAPI(userTicket.toString('hex'), steamID, appID);

        const user = await this.userService.findOrCreateFromGame(steamID);

        if (!user) throw new InternalServerErrorException('Could not get or create user');

        request.user = user;
        return true;
    }

    private async verifyUserTicketOnlineAPI(userTicket: string, steamIDToVerify: bigint, appID: number): Promise<void> {
        const steamID = await this.steamService.tryAuthenticateUserTicketOnline(userTicket, appID);

        if (steamIDToVerify !== steamID) throw new UnauthorizedException('Invalid user ticket');
    }

    private verifyUserTicketLocalLibrary(userTicketRaw: Buffer, steamIDToVerify: bigint): void {
        // Note: This hasn't been tested yet! Needs a secret that only Goc has access to.
        const { steamID, appID } = this.steamService.tryAuthenticateUserTicketLocal(userTicketRaw);

        if (!this.configService.get('appIDs').includes(appID) || steamID !== steamIDToVerify)
            throw new UnauthorizedException('Invalid user ticket');
    }
}
