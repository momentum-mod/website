import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserAuth } from '@prisma/client';
import { JWTResponseDto } from '../../common/dto/jwt-response.dto';
import { UsersRepoService } from '../repo/users-repo.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    // TODO: remove
    loggedInUser: User;

    constructor(
        private readonly userRepo: UsersRepoService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService
    ) {}

    async login(user: User, gameAuth = false): Promise<JWTResponseDto> {
        if (!user) throw new UnauthorizedException();

        const token = await this.genAccessToken(user, gameAuth);
        const refreshToken = await this.genRefreshToken(user.id, gameAuth);
        const response: JWTResponseDto = {
            access_token: token,
            expires_in: this.config.get('accessToken.expTime'),
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
            issuer: this.config.get('domain'),
            expiresIn: gameAuth ? this.config.get('accessToken.gameExpTime') : this.config.get('accessToken.expTime')
        };
        return this.jwtService.sign(payload, options);
    }

    private async genRefreshToken(userID: number, gameAuth?: boolean): Promise<string> {
        const payload = { id: userID };
        const options = {
            issuer: this.config.get('domain'),
            expiresIn: gameAuth
                ? this.config.get('accessToken.gameRefreshExpTime')
                : this.config.get('accessToken.refreshExpTime')
        };
        return this.jwtService.sign(payload, options);
    }
}

export type JWTPayload = {
    id: number;
    steamID: string;
    gameAuth: boolean;
};
