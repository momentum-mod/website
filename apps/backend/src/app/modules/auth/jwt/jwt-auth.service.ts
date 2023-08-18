import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  DtoFactory,
  JWTResponseGameDto,
  JWTResponseWebDto
} from '@momentum/backend/dto';
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
      token: token,
      length: token.length
    });
  }

  //#endregion

  //#region Tokens

  async revokeRefreshToken(accessToken: string): Promise<void> {
    const { id } = this.verifyJwt(accessToken);

    await this.getUser(id);

    await this.db.userAuth.upsert({
      where: { userID: id },
      update: { refreshToken: '' },
      create: { userID: id, refreshToken: '' }
    });
  }

  async refreshRefreshToken(refreshToken: string): Promise<JWTResponseWebDto> {
    const { id } = this.verifyJwt(refreshToken);

    const user = await this.getUser(id);

    const tokenDto = await this.generateWebTokenPair(id, user.steamID);

    await this.db.userAuth.upsert({
      where: { userID: id },
      update: { refreshToken: tokenDto.refreshToken },
      create: { userID: id, refreshToken: tokenDto.refreshToken }
    });

    return tokenDto;
  }

  private async generateWebTokenPair(
    id: number,
    steamID: bigint
  ): Promise<JWTResponseWebDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken({ id, steamID: steamID, gameAuth: false }),
      this.generateRefreshToken({ id })
    ]);

    return DtoFactory(JWTResponseWebDto, {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: this.config.get('jwt.expTime')
    });
  }

  private generateAccessToken(payload: UserJwtAccessPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: payload.gameAuth
        ? this.config.get('jwt.gameExpTime')
        : this.config.get('jwt.expTime')
    });
  }

  private async generateRefreshToken(payload: UserJwtPayload): Promise<string> {
    const options = { expiresIn: this.config.get('jwt.refreshExpTime') };
    const refreshToken = await this.jwtService.signAsync(payload, options);

    await this.db.userAuth.upsert({
      where: { userID: payload.id },
      update: { refreshToken },
      create: { userID: payload.id, refreshToken }
    });

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
