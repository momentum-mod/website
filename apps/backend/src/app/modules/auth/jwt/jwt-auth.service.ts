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

  async loginGame(user: AuthenticatedUser): Promise<JWTResponseGameDto> {
    // Game doesn't get a refresh token, just a longer lasting access token.
    const token = await this.generateAccessToken({
      id: user.id,
      steamID: user.steamID,
      gameAuth: true
    });

    return DtoFactory(JWTResponseGameDto, {
      token,
      length: token.length
    });
  }

  //#endregion

  //#region Tokens

  async refreshRefreshToken(refreshToken: string): Promise<JWTResponseWebDto> {
    const { id } = this.verifyJwt(refreshToken);

    const user = await this.getUser(id);

    return await this.generateWebTokenPair(id, user.steamID);
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
