import { Req, Res, Controller, Get, Post, UseGuards, Body, Headers, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as passport from 'passport';
import { Public } from '../../@common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { SteamWebAuthGuard } from './guard/steam-web-auth.guard';
import { User } from '@prisma/client';
import { SteamAuthService } from './steam-auth.service';
import { JWTResponseDto } from '../../@common/dto/jwt-response.dto';
import { LoggedInUser } from '../../@common/decorators/logged-in-user.decorator';

@Controller('/auth')
@ApiTags('Auth')
@Public()
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly steamAuthService: SteamAuthService) {}

    @ApiOperation({ summary: 'Authenticates using Steam' })
    @Get('/steam')
    authSteam(@Req() req, @Res() res): void {
        passport.authenticate('steam', { session: false })(req, res);
    }

    @ApiOperation({ summary: 'Return url from Steam, validate and return valid JWT' })
    @Get('/steam/return')
    @UseGuards(SteamWebAuthGuard)
    // TODO: loggedinuser?
    async returnFromSteam(@LoggedInUser() user): Promise<JWTResponseDto> {
        return this.authService.login(user as User, false);
    }

    @ApiOperation({ summary: 'Gets the JWT using a Steam user ticket' })
    @Post('/steam/user')
    async getUserFromSteam(@Req() req: RawBodyRequest<Request>): Promise<JWTResponseDto> {

        const user = await this.steamAuthService.validateFromInGame(req.body, userID);
        return await this.authService.login(user as User, true);
    }
}
