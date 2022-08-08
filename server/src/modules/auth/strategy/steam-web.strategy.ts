import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-steam';
import { SteamAuthService } from '../steam-auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SteamWebStrategy extends PassportStrategy(Strategy, 'steam') {
    constructor(private readonly steamAuthService: SteamAuthService, private readonly config: ConfigService) {
        super({
            returnURL: config.get('url.auth') + '/auth/steam/return',
            realm: config.get('url.auth'),
            apiKey: config.get('steam.webAPIKey')
        });
    }

    async validate(openID, profile) {
        const jwtToken = await this.steamAuthService.validateFromSteamWeb(openID, profile);

        if (!jwtToken) throw new HttpException('Could not find or create user profile', 500);

        return jwtToken;
    }
}
