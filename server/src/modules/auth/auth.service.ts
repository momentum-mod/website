import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { appConfig } from '../../../config/config';
import { JWTResponseDto } from '../../@common/dto/common/api-response.dto';

@Injectable()
export class AuthService {
    loggedInUser: User;

    constructor(private readonly userService: UsersService, private readonly jwtService: JwtService) {}

    async login(user: User, gameAuth = false): Promise<JWTResponseDto> {
        if (!user) {
            throw new UnauthorizedException();
        }

        const token = await this.GenAccessToken(user, gameAuth);
        const refreshToken = await this.GenRefreshToken(user.id, gameAuth);
        const response: JWTResponseDto = {
            access_token: token,
            expires_in: appConfig.accessToken.expTime,
            refresh_token: refreshToken,
            token_type: 'JWT'
        };

        this.loggedInUser = user;

        return response;
    }

    async RevokeToken(userID: number): Promise<void> {
        this.loggedInUser = null;
        await this.userService.UpdateRefreshToken(userID, '');
    }

    private async GenAccessToken(usr: User, gameAuth?: boolean): Promise<string> {
        const payload: JWTPayload = {
            id: usr.id,
            steamID: usr.steamID,
            roles: usr.roles,
            bans: usr.bans,
            gameAuth: !!gameAuth
        };
        const options = {
            issuer: appConfig.domain,
            expiresIn: gameAuth ? appConfig.accessToken.gameExpTime : appConfig.accessToken.expTime
        };
        return this.jwtService.sign(payload, options);
    }

    private async GenRefreshToken(userID: number, gameAuth?: boolean): Promise<string> {
        const payload = {
            id: userID
        };
        const options = {
            issuer: appConfig.domain,
            expiresIn: gameAuth ? appConfig.accessToken.gameRefreshExpTime : appConfig.accessToken.refreshExpTime
        };
        return this.jwtService.sign(payload, options);
    }
}

export type JWTPayload = {
    id: number;
    steamID: string;
    roles: number;
    bans: number;
    gameAuth: boolean;
};
