import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { parallel } from '@momentum/util-fn';
import {
  DtoFactory,
  JWTResponseGameDto,
  JWTResponseWebDto
} from '../../../dto';
import {
  AuthenticatedUser,
  UserJwtAccessPayload,
  UserJwtPayload,
  UserJwtPayloadVerified
} from '../auth.interface';
import { EXTENDED_PRISMA_SERVICE } from '../../database/db.constants';
import { ExtendedPrismaService } from '../../database/prisma.extension';

@Injectable()
export class JwtAuthService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,

    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  //#region Login

  async loginWeb(user: AuthenticatedUser): Promise<JWTResponseWebDto> {
    return this.generateWebTokenPair(user.id, user.steamID);
  }

  /**
   * Older game clients reject unknown response fields, so the refresh token is
   * only included when the client asks for it.
   */
  async loginGame(
    user: AuthenticatedUser,
    withRefreshToken = false
  ): Promise<JWTResponseGameDto> {
    return this.generateGameTokens(user.id, user.steamID, withRefreshToken);
  }

  //#endregion

  //#region Tokens

  async refreshRefreshToken(refreshToken: string): Promise<JWTResponseWebDto> {
    const { id, gameRefresh } = this.verifyJwt(refreshToken);

    if (gameRefresh) throw new UnauthorizedException('Invalid token');

    const user = await this.getUser(id);

    return await this.generateWebTokenPair(id, user.steamID);
  }

  /** Renews game tokens without needing a Steam ticket. */
  async refreshGameToken(refreshToken: string): Promise<JWTResponseGameDto> {
    const { id, gameRefresh } = this.verifyJwt(refreshToken);

    if (!gameRefresh) throw new UnauthorizedException('Invalid token');

    const user = await this.getUser(id);

    return await this.generateGameTokens(id, user.steamID, true);
  }

  private async generateGameTokens(
    id: number,
    steamID: bigint,
    withRefreshToken: boolean
  ): Promise<JWTResponseGameDto> {
    const [token, refreshToken] = await parallel(
      this.generateAccessToken({ id, steamID, gameAuth: true }),
      withRefreshToken
        ? this.generateRefreshToken({ id, gameRefresh: true })
        : Promise.resolve(undefined)
    );

    return DtoFactory(JWTResponseGameDto, {
      token,
      length: token.length,
      ...(refreshToken && { refreshToken })
    });
  }

  private async generateWebTokenPair(
    id: number,
    steamID: bigint
  ): Promise<JWTResponseWebDto> {
    const [accessToken, refreshToken] = await parallel(
      this.generateAccessToken({ id, steamID: steamID, gameAuth: false }),
      this.generateRefreshToken({ id })
    );

    return DtoFactory(JWTResponseWebDto, {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: this.config.getOrThrow('jwt.expTime')
    });
  }

  private generateAccessToken(payload: UserJwtAccessPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.config.getOrThrow(
        payload.gameAuth ? 'jwt.gameExpTime' : 'jwt.expTime'
      )
    });
  }

  private async generateRefreshToken(payload: UserJwtPayload): Promise<string> {
    const options = { expiresIn: this.config.getOrThrow('jwt.refreshExpTime') };
    const refreshToken = await this.jwtService.signAsync(payload, options);

    return refreshToken;
  }

  private verifyJwt(token: string): UserJwtPayloadVerified {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw [
        'TokenExpiredError',
        'JsonWebTokenError',
        'NotBeforeError'
      ].includes(error.name)
        ? new UnauthorizedException('Invalid token')
        : new InternalServerErrorException();
    }
  }

  //#endregion

  //#region Validation

  private async getUser(userID: number) {
    const user = await this.db.user.findUnique({ where: { id: userID } });

    if (!user) throw new UnauthorizedException('User not found');

    return user;
  }

  //#endregion
}
