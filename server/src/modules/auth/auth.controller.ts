import { Body, Controller, Get, HttpCode, HttpStatus, Post, Redirect, Req, Res, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags
} from '@nestjs/swagger';
import { BypassJwtAuth } from '@common/decorators/bypass-jwt.decorator';
import { AuthService } from './auth.service';
import { SteamAuthService } from './steam-auth.service';
import { JWTResponseGameDto, JWTResponseWebDto } from '@common/dto/auth/jwt-response.dto';
import { LoggedInUser } from '@common/decorators/logged-in-user.decorator';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenDto } from '@common/dto/auth/refresh-token.dto';
import { SteamWebAuthGuard } from '@modules/auth/guards/steam-web-auth.guard';

@Controller('auth')
@ApiTags('Auth')
@ApiBearerAuth()
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly steamAuthService: SteamAuthService,
        private readonly configService: ConfigService
    ) {}

    //#region Main Auth

    // This endpoint is really complex, worth reading up on NestJS and Passport to understand it:
    // https://docs.nestjs.com/security/authentication. Rather than requring a JWT access token, the route sitsm behind
    // the SteamWebAuthGuard. Requesting this endpoint without having gone through Steam OpenID login will trigger the
    // guard, which calls the SteamWebStrategy. The validate method in there will try to find an existing user with the
    // OpenID token Steam provides (which contains the Steam user's SteamID). If the user doesn't exist we create it
    // using data from Steam's public API, and then create a JWT for the found/created user.
    @Get('/steam')
    @BypassJwtAuth()
    @UseGuards(SteamWebAuthGuard)
    @Redirect('/', 301)
    @ApiOperation({
        summary: 'Authenticates using the Steam OpenID portal'
    })
    @ApiParam({
        name: 'r',
        description: 'The referrer URL i.e. relative URL of the location on the frontend',
        type: String,
        required: false
    })
    async steamAuth(@Req() req, @Res() res, @LoggedInUser() user) {
        // Our Passport Strategy returns us to this endpoint once Steam auth has completed successfully, and our
        // `validate` function has set the `user` property on the request: hence we can use @LoggedInUser to grab it.
        // Then we just need to generate our access and refresh tokens, and set them and the User data as cookies on
        // the client. The frontend handles taking the accessToken cookie and setting it as the bearer token on requests.
        const jwt = await this.authService.loginWeb(user);

        const domain = this.configService.get('domain');
        res.cookie('accessToken', jwt.accessToken, { domain: domain });
        res.cookie('refreshToken', jwt.refreshToken, { domain: domain });
        //res.cookie('user', JSON.stringify(user), { domain: domain });

        const referrer = req.session?.referrer;
        if (referrer) {
            delete req.session.refeffer;
            return { url: referrer }; // This overrides the '/' in the @Redirect
        }
    }

    // TODO: (REQ GAME CHANGE) This name is dumb, requires a game code change though.
    @Post('/steam/user')
    @BypassJwtAuth()
    @ApiOperation({ summary: 'Gets the JWT using a Steam user ticket' })
    @ApiBody({
        type: 'application/octet-stream',
        description: 'Octet-stream of a Steam user auth ticket from Steam',
        required: true
    })
    @ApiOkResponse({ type: JWTResponseGameDto, description: 'Authorized steam user token' })
    async getUserFromSteam(@Req() req): Promise<JWTResponseGameDto> {
        const id = req.headers['id'];

        // raw-body middleware ensures that this is a buffer.
        const rawBody = req.body as unknown as Buffer;

        // With playtest ongoing we want to check we have the right appID for the online Steam API request.
        // The game includes this in user-agent (e.g. `Valve/Steam HTTP Client 1.0 (<appID>)`), dig it out with a regex.
        const appID = Number.parseInt(/(?!=\()\d+(?=\))/.exec(req.headers['user-agent'])?.[0]);

        const user = await this.steamAuthService.validateFromInGame(id, rawBody, appID);

        return await this.authService.loginGame(user);
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
