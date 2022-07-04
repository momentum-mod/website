import { Req, Res, Controller, Get, Post, HttpException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as passport from 'passport';
import { Public } from '../../@common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { SteamWebAuthGuard } from './guard/steam-web-auth.guard';
import { User } from '@prisma/client';
import { SteamAuthService } from './steam-auth.service';
import { JWTResponseDto } from '../../@common/dto/jwt-response.dto';

@Controller('/auth')
@ApiTags('Auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly steamAuthService: SteamAuthService) {}

    @ApiOperation({ summary: 'Authenticates using steam' })
    @Get('/steam')
    @Public()
    authSteam(@Req() req, @Res() res): void {
        passport.authenticate('steam', { session: false })(req, res);
    }

    @ApiOperation({ summary: 'Return url from steam, validate and return valid JWT' })
    @Get('/steam/return')
    @UseGuards(SteamWebAuthGuard)
    async returnFromSteam(@Req() req: Request): Promise<JWTResponseDto> {
        return this.authService.login(req.user as User, false);
    }

    @ApiOperation({ summary: 'Gets the JWT using a steam user ticket' })
    @Post('/steam/user')
    @Public()
    async getUserFromSteam(@Req() req: Request): Promise<JWTResponseDto> {
        const userID = req.headers['id'] as string;
        if (!req.body) {
            throw new HttpException('Missing userTicket', 400);
        }

        const user = await this.steamAuthService.validateFromInGame(req.body, userID);
        return await this.authService.login(user as User, true);
    }
}
