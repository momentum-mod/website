import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Redirect,
  Req,
  Res,
  UseGuards,
  VERSION_NEUTRAL
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JwtAuthService } from './jwt/jwt-auth.service';
import { SteamOpenIDService } from './steam/steam-openid.service';
import { BypassJwtAuth, LoggedInUser } from '@momentum/backend/decorators';
import { SteamWebGuard } from './steam/steam-web.guard';
import { SteamGameGuard } from './steam/steam-game.guard';
import {
  JWTResponseGameDto,
  JWTResponseWebDto,
  RefreshTokenDto
} from '@momentum/backend/dto';
import { CookieSerializeOptions } from '@fastify/cookie';

@Controller({
  path: 'auth',
  version: VERSION_NEUTRAL
})
@ApiTags('Auth')
@ApiBearerAuth()
export class AuthController {
  private readonly cookieOptions: CookieSerializeOptions;

  constructor(
    private readonly authService: JwtAuthService,
    private readonly configService: ConfigService,
    private readonly steamOpenID: SteamOpenIDService
  ) {
    this.cookieOptions = {
      domain: this.configService.get('domain'),
      // The value on the cookies gets transferred to local storage immediately,
      // so just use a short lifetime of 10s.
      maxAge: 10000,
      path: '/',
      // So frontend can access. Cookie is deleted immediately so never
      // retrurned to the backend, so no CSRF risk.
      httpOnly: false
    };
  }

  //#region Main Auth

  @Get('/steam')
  @Redirect('', HttpStatus.FOUND)
  @BypassJwtAuth()
  @ApiOperation({ summary: 'Authenticates using the Steam OpenID portal' })
  async steamWebAuth() {
    return { url: await this.steamOpenID.getRedirectUrl() };
  }

  @Get('/steam/return')
  @Redirect('/dashboard', HttpStatus.FOUND)
  @BypassJwtAuth()
  @UseGuards(SteamWebGuard)
  async steamWebAuthReturn(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @LoggedInUser() user
  ) {
    const jwt = await this.authService.loginWeb(user);

    res.setCookie('accessToken', jwt.accessToken, this.cookieOptions);
    res.setCookie('refreshToken', jwt.refreshToken, this.cookieOptions);
    res.setCookie('user', JSON.stringify(user), this.cookieOptions);
  }

  // TODO: (REQ GAME CHANGE) This name is dumb, requires a game code change though.
  @Post('/steam/user')
  @BypassJwtAuth()
  @UseGuards(SteamGameGuard)
  @ApiOperation({ summary: 'Gets the JWT using a Steam user ticket' })
  @ApiBody({
    type: 'application/octet-stream',
    description: 'Octet-stream of a Steam user auth ticket from Steam',
    required: true
  })
  @ApiOkResponse({
    type: JWTResponseGameDto,
    description: 'Authorized steam user token'
  })
  async steamGameAuth(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @LoggedInUser() user
  ): Promise<JWTResponseGameDto> {
    return this.authService.loginGame(user);
  }

  @Post('/refresh')
  @ApiOperation({
    summary: 'Generate a new access token for a given refresh token'
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    type: JWTResponseWebDto,
    description: 'Refreshed web tokens'
  })
  refreshToken(@Body() body: RefreshTokenDto) {
    // TODO: (REQ FRONTEND CHANGE) The old API just returned a new access token here, it now returns a refresh token
    // as well. Just change stuff in refreshAccessToken in CLIENT (!) auth.service.ts.
    return this.authService.refreshRefreshToken(body.refreshToken);
  }

  @Post('/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revokes the given token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiNoContentResponse()
  async revokeToken(@Req() req) {
    const token = req.headers['Authorization'].replace('Bearer ', '');

    await this.authService.revokeRefreshToken(token);
  }

  //#endregion
}
