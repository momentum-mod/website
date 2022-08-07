import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserAuth } from '@prisma/client';
import { appConfig } from '../../../config/config';
import { JWTResponseDto } from '../../common/dto/jwt-response.dto';
import { UsersRepoService } from '../repo/users-repo.service';

@Injectable()
export class AuthService {
    // TODO: remove
    loggedInUser: User;

    constructor(private readonly userRepo: UsersRepoService, private readonly jwtService: JwtService) {}

    async login(user: User, gameAuth = false): Promise<JWTResponseDto> {
        if (!user) throw new UnauthorizedException();

        const token = await this.genAccessToken(user, gameAuth);
        const refreshToken = await this.genRefreshToken(user.id, gameAuth);
        const response: JWTResponseDto = {
            access_token: token,
            expires_in: appConfig.accessToken.expTime,
            refresh_token: refreshToken,
            token_type: 'JWT'
        };

        this.loggedInUser = user;

        return response;
    }

    async revokeToken(userID: number): Promise<void> {
        this.loggedInUser = null;
        await this.updateRefreshToken(userID, '');
    }

    updateRefreshToken(userID: number, refreshToken: string): Promise<UserAuth> {
        return this.userRepo.updateAuth({ userID: userID }, { refreshToken: refreshToken });
    }

    private async genAccessToken(usr: User, gameAuth?: boolean): Promise<string> {
        const payload: JWTPayload = {
            id: usr.id,
            steamID: usr.steamID,
            gameAuth: Boolean(gameAuth)
        };
        const options = {
            issuer: appConfig.domain,
            expiresIn: gameAuth ? appConfig.accessToken.gameExpTime : appConfig.accessToken.expTime
        };
        return this.jwtService.sign(payload, options);
    }

    private async genRefreshToken(userID: number, gameAuth?: boolean): Promise<string> {
        const payload = { id: userID };
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
    gameAuth: boolean;
};
