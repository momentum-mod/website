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
import { ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BypassJwtAuth } from '@common/decorators/bypass-jwt.decorator';
import { JWTResponseGameDto, JWTResponseWebDto } from '@common/dto/auth/jwt-response.dto';
import { LoggedInUser } from '@common/decorators/logged-in-user.decorator';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenDto } from '@common/dto/auth/refresh-token.dto';
import { SteamWebGuard } from '@modules/auth/steam/steam-web.guard';
import { FastifyReply, FastifyRequest } from 'fastify';
import { SteamOpenIDService } from '@modules/auth/steam/steam-openid.service';
import { JwtAuthService } from './jwt/jwt-auth.service';
import { SteamGameGuard } from '@modules/auth/steam/steam-game.guard';

@Controller({
    path: 'auth',
    version: VERSION_NEUTRAL
})
@ApiTags('Auth')
@ApiBearerAuth()
export class AuthController {
    constructor(
        private readonly authService: JwtAuthService,
        private readonly configService: ConfigService,
        private readonly steamOpenID: SteamOpenIDService
    ) {}

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
    async steamWebAuthReturn(@Req() req: FastifyRequest, @Res() res: FastifyReply, @LoggedInUser() user) {
        const jwt = await this.authService.loginWeb(user);

        res.setCookie('accessToken', jwt.accessToken, { domain: this.configService.get('domain') });
        res.setCookie('refreshToken', jwt.refreshToken, { domain: this.configService.get('domain') });
        res.setCookie('user', JSON.stringify(user), { domain: this.configService.get('domain') });
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
    @ApiOkResponse({ type: JWTResponseGameDto, description: 'Authorized steam user token' })
    async steamGameAuth(@Req() req: RawBodyRequest<FastifyRequest>, @LoggedInUser() user): Promise<JWTResponseGameDto> {
        return this.authService.loginGame(user);
    }

    @Post('/refresh')
    @ApiOperation({ summary: 'Generate a new access token for a given refresh token' })
    @ApiBody({ type: RefreshTokenDto })
    @ApiOkResponse({ type: JWTResponseWebDto, description: 'Refreshed web tokens' })
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
