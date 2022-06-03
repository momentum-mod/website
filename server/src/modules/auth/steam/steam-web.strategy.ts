import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { appConfig } from '../../../../config/config';
import { Strategy } from 'passport-steam';
import { SteamAuthService } from './steam-auth.service';

@Injectable()
export class SteamWebStrategy extends PassportStrategy(Strategy, 'steam') {
    constructor(private readonly steamAuthService: SteamAuthService) {
        super({
            returnURL: appConfig.baseURL_Auth + '/auth/steam/return',
            realm: appConfig.baseURL_Auth,
            apiKey: appConfig.steam.webAPIKey
        });
    }

    async validate(openID, profile) {
        const jwtToken = await this.steamAuthService.ValidateFromSteamWeb(openID, profile);
        if (!jwtToken) {
            throw new HttpException('Could not find or create user profile', 500);
        }

        return jwtToken;
    }
}
