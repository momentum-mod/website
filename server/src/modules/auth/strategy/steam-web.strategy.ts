import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-steam';
import { SteamAuthService } from '../steam-auth.service';
import { ConfigService } from '@nestjs/config';
import { SteamUserSummaryResponse } from '@modules/steam/steam.interface';
import { AuthenticatedUser } from '@modules/auth/auth.interface';

@Injectable()
export class SteamWebStrategy extends PassportStrategy(Strategy, 'steam') {
    constructor(private readonly steamAuthService: SteamAuthService, private readonly config: ConfigService) {
        super({
            returnURL: config.get('url.auth') + '/auth/steam',
            realm: config.get('url.auth'),
            apiKey: config.get('steam.webAPIKey'),
            passReqToCallback: false, // Not using referral system for now, so unneeded. If using, add `request: FastifyRequest` as first arg in validate().
            session: false // Don't want to use Passport's mystical session system
        });
    }

    async validate(_openID: string, responseData: SteamUserSummaryResponse): Promise<AuthenticatedUser> {
        const user = await this.steamAuthService.validateFromSteamWeb(responseData._json);

        if (!user) throw new InternalServerErrorException('Could not find or create user profile');

        return user;
    }
}
