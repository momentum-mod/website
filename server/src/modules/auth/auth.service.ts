import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User, UserAuth } from '@prisma/client';
import { appConfig } from '../../../config/config';
import { JWTResponseDto } from '../../@common/dto/jwt-response.dto';
import { UsersRepoService } from '../repo/users-repo.service';

@Injectable()
export class AuthService {
    loggedInUser: User;

    constructor(private readonly userRepo: UsersRepoService, private readonly jwtService: JwtService) {}

    async login(user: User, gameAuth = false): Promise<JWTResponseDto> {
        if (!user) {
            throw new UnauthorizedException();
        }

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

    async updateRefreshToken(userID: number, refreshToken: string): Promise<UserAuth> {
        const updateInput: Prisma.UserAuthUpdateInput = {};
        updateInput.refreshToken = refreshToken;
        const whereInput: Prisma.UserAuthWhereUniqueInput = {};
        whereInput.id = userID;
        return await this.userRepo.updateAuth(whereInput, updateInput);
    }

    private async genAccessToken(usr: User, gameAuth?: boolean): Promise<string> {
        const payload: JWTPayload = {
            id: usr.id,
            steamID: usr.steamID,
            roles: usr.roles,
            bans: usr.bans,
            gameAuth: Boolean(gameAuth)
        };
        const options = {
            issuer: appConfig.domain,
            expiresIn: gameAuth ? appConfig.accessToken.gameExpTime : appConfig.accessToken.expTime
        };
        return this.jwtService.sign(payload, options);
    }

    private async genRefreshToken(userID: number, gameAuth?: boolean): Promise<string> {
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
