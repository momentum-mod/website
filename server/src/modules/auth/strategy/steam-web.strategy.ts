import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-steam';
import { SteamAuthService } from '../steam-auth.service';
import { ConfigService } from '@nestjs/config';
import { SteamUserSummaryResponse } from '@modules/auth/auth.interfaces';
import { User } from '@prisma/client';

@Injectable()
export class SteamWebStrategy extends PassportStrategy(Strategy, 'steam') {
    constructor(private readonly steamAuthService: SteamAuthService, private readonly config: ConfigService) {
        super({
            returnURL: config.get('url.auth') + '/auth/steam',
            realm: config.get('url.auth'),
            apiKey: config.get('steam.webAPIKey'),
            passReqToCallback: true, // Used in referral system attempt, unneeded otherwise.
            session: false
        });
    }

    async validate(req, openID: string, response: SteamUserSummaryResponse): Promise<User & { referrer?: string }> {
        const user = await this.steamAuthService.validateFromSteamWeb(response._json);

        if (!user) throw new InternalServerErrorException('Could not find or create user profile');

        // TODO: This is a flawed attempt to fix the Passport referral issue, maybe interesting in the future.
        // req.session.referrer is undefined here.
        const referrer = req.session?.referrer;

        return referrer ? { ...user, referrer: referrer as string } : user;
    }
}
