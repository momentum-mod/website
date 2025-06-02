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
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CookieSerializeOptions } from '@fastify/cookie';
import { BypassJwtAuth, LoggedInUser } from '../../decorators';
import {
  JWTResponseGameDto,
  JWTResponseWebDto,
  RefreshTokenDto
} from '../../dto';
import { JwtAuthService } from './jwt/jwt-auth.service';
import { SteamOpenIDService } from './steam/steam-openid.service';
import { SteamWebGuard } from './steam/steam-web.guard';
import { SteamGameGuard } from './steam/steam-game.guard';

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
    // We only need cookies as a secure mechanism to transfer JWTs back to the
    // client, we can't transfer a body since /web/return is part of a chain
    // of OpenID redirects. Instead, we set very short-lived but JS-readable
    // cookies, which the  frontend keeps in local storage.
    this.cookieOptions = {
      domain: this.configService.getOrThrow('domain'),
      maxAge: 10,
      httpOnly: false,
      path: '/',
      sameSite: 'strict',
      secure: true
    };
  }

  //#region Main Auth

  @Get('/web')
  @Redirect('', HttpStatus.FOUND)
  @BypassJwtAuth()
  @ApiOperation({
    summary:
      'Initiates a browser-based OpenID login workflow using the Steam portal'
  })
  async steamWebAuth() {
    return { url: await this.steamOpenID.getRedirectUrl() };
  }

  @Get('/web/return')
  @Redirect('', HttpStatus.FOUND)
  @BypassJwtAuth()
  @UseGuards(SteamWebGuard)
  @ApiOperation({ summary: 'Assigns a JWT using OpenID data from Steam login' })
  async steamWebAuthReturn(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @LoggedInUser() user
  ) {
    const jwt = await this.authService.loginWeb(user);

    res.setCookie('accessToken', jwt.accessToken, this.cookieOptions);
    res.setCookie('refreshToken', jwt.refreshToken, this.cookieOptions);
    res.setCookie('user', JSON.stringify(user), this.cookieOptions);

    return { url: this.configService.getOrThrow('url.frontend') };
  }

  @Post('/game')
  @BypassJwtAuth()
  @UseGuards(SteamGameGuard)
  @ApiOperation({
    summary: 'Assigns a JWT using user ticket from the Momentum client'
  })
  @ApiBody({
    type: 'application/octet-stream',
    description: 'Octet-stream of a Steam user auth ticket from Steam',
    required: true
  })
  @ApiOkResponse({
    type: JWTResponseGameDto,
    description: 'Authorized steam user token'
  })
  @ApiForbiddenResponse({
    description:
      'For limited Steam accounts, or accounts that permanently deleted themselves'
  })
  @ApiServiceUnavailableResponse({
    description:
      'When authenticate requires us request from Steam, and Steam is down'
  })
  @ApiConflictResponse({
    description:
      "When player is a new account and we've temporarily disabled sign-ups"
  })
  @ApiUnauthorizedResponse({
    description: 'When login token is invalid'
  })
  @ApiBadRequestResponse({
    description: 'When provided login data is malformed'
  })
  @ApiBadGatewayResponse({
    description: 'If this API is down'
  })
  async steamGameAuth(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @LoggedInUser() user
  ): Promise<JWTResponseGameDto> {
    return this.authService.loginGame(user);
  }

  @BypassJwtAuth()
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
    return this.authService.refreshRefreshToken(body.refreshToken);
  }

  @Post('/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revokes the given token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiNoContentResponse()
  async revokeToken(@Req() req) {
    // If passed JwtGuard, `authorization` must be in headers.
    const accessToken = req.headers.authorization.replace('Bearer ', '');
    await this.authService.revokeRefreshToken(accessToken);
  }

  //#endregion
}
