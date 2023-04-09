import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWTResponseGameDto, JWTResponseWebDto } from '@common/dto/auth/jwt-response.dto';
import { UsersRepoService } from '../../repo/users-repo.service';
import { ConfigService } from '@nestjs/config';
import {
    AuthenticatedUser,
    UserJwtAccessPayload,
    UserJwtPayload,
    UserJwtPayloadVerified
} from '@modules/auth/auth.interface';
import { DtoFactory } from '@lib/dto.lib';

@Injectable()
export class JwtAuthService {
    constructor(
        private readonly userRepo: UsersRepoService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService
    ) {}

    //#region Login

    async loginWeb(user: AuthenticatedUser): Promise<JWTResponseWebDto> {
        return this.generateWebTokenPair(user.id, user.steamID);
    }

    async loginGame(user: AuthenticatedUser): Promise<JWTResponseGameDto> {
        // Game doesn't get a refresh token, just a longer lasting access token.
        const token = await this.generateAccessToken({
            id: user.id,
            steamID: user.steamID,
            gameAuth: true
        });

        return DtoFactory(JWTResponseGameDto, {
            token: token,
            length: token.length
        });
    }

    //#endregion

    //#region Tokens

    async revokeRefreshToken(refreshToken: string): Promise<void> {
        const { id } = this.verifyRefreshToken(refreshToken);

        await this.getUser(id);

        await this.userRepo.upsertAuth(id, '');
    }

    async refreshRefreshToken(refreshToken: string): Promise<JWTResponseWebDto> {
        const { id } = this.verifyRefreshToken(refreshToken);

        const user = await this.getUser(id);

        const tokenDto = await this.generateWebTokenPair(id, user.steamID);

        await this.userRepo.upsertAuth(id, tokenDto.refreshToken);

        return tokenDto;
    }

    private async generateWebTokenPair(id: number, steamID: string): Promise<JWTResponseWebDto> {
        const [accessToken, refreshToken] = await Promise.all([
            this.generateAccessToken({ id, steamID: steamID, gameAuth: false }),
            this.generateRefreshToken({ id })
        ]);

        return DtoFactory(JWTResponseWebDto, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: this.config.get('accessToken.expTime')
        });
    }

    private generateAccessToken(payload: UserJwtAccessPayload): Promise<string> {
        return this.jwtService.signAsync(payload, {
            expiresIn: payload.gameAuth
                ? this.config.get('accessToken.gameExpTime')
                : this.config.get('accessToken.expTime')
        });
    }

    private async generateRefreshToken(payload: UserJwtPayload): Promise<string> {
        const options = { expiresIn: this.config.get('accessToken.refreshExpTime') };
        const token = await this.jwtService.signAsync(payload, options);

        await this.userRepo.upsertAuth(payload.id, token);

        return token;
    }

    private verifyRefreshToken(token: string): UserJwtPayloadVerified {
        try {
            return this.jwtService.verify(token);
        } catch (error) {
            throw ['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(error.name)
                ? new UnauthorizedException('Invalid token')
                : new InternalServerErrorException();
        }
    }

    //#endregion

    //#region Validation

    private async getUser(userID: number) {
        const user = await this.userRepo.get(userID);

        if (!user) throw new UnauthorizedException('User not found');

        return user;
    }

    //#endregion
}
