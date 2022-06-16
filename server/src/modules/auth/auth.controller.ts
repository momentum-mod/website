import { Req, Res, Controller, Get, Post, HttpException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as passport from 'passport';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { SteamWebAuthGuard } from './steam/steam-web-auth.guard';
import { User } from '@prisma/client';
import { SteamAuthService } from './steam/steam-auth.service';
import { JWTResponseDto } from '../../@common/dto/jwt-response.dto';

@Controller('/auth')
@ApiTags('Auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly steamAuthService: SteamAuthService) {}

    @ApiOperation({ summary: 'Authenticates using steam' })
    @Get('/steam')
    @Public()
    public AuthSteam(@Req() req, @Res() res): void {
        passport.authenticate('steam', { session: false })(req, res);
    }

    @ApiOperation({ summary: 'Return url from steam, validate and return valid JWT' })
    @Get('/steam/return')
    @UseGuards(SteamWebAuthGuard)
    public async ReturnFromSteam(@Req() req: Request): Promise<JWTResponseDto> {
        return this.authService.login(req.user as User, false);
    }

    @ApiOperation({ summary: 'Gets the JWT using a steam user ticket' })
    @Post('/steam/user')
    @Public()
    public async GetUserFromSteam(@Req() req: Request): Promise<JWTResponseDto> {
        const userID = req.headers['id'] as string;
        if (!req.body) {
            throw new HttpException('Missing userTicket', 400);
        }

        const user = await this.steamAuthService.ValidateFromInGame(req.body, userID);
        return await this.authService.login(user as User, true);
    }
}
