import { Req, Res, Controller, Get, HttpException, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as passport from 'passport';
import { Public } from '../auth/public.decorator';
import { AuthService } from '../auth/auth.service';
import { OpenIDDto } from '../dto/open-ID.dto';
import { JWTResponseDto } from '../dto/api-response.dto';

@Controller("api/v1/auth")
@ApiTags("Auth")
export class AuthController {

    constructor(private authService: AuthService) {}

    @ApiOperation({summary: "Authenticates using steam"}) 
    @Get("steam") 
    @Public()
    public AuthSteam(@Req() req, @Res() res): void {     
		passport.authenticate('steam', { session: false })(req, res);
    }

    @ApiOperation({summary: "Return url from steam, validate and return valid JWT"}) 
    @Get("steam/return") 
    @Public()
    public async ReturnFromSteam(@Query() res): Promise<JWTResponseDto> {
        // Small hack to parse our openID response into an object
        // Should this be done in a service??? Probably,
        // but then again its a hack so we shouldn't be doing it full stop
        const openIDObj = new OpenIDDto();

        Object.keys(res).forEach((key) => {
            const value = res[key];
            const classKey = key.replace("openid.", "");

            openIDObj[classKey] = value;
        })
        // hack over

        if(!openIDObj) { throw new HttpException('Missing openIDObj', 400)}

        const jwt = await this.authService.ValidateFromWeb(openIDObj);
        if (!jwt) { throw new HttpException("Error validtating Steam OpenID", 500) }
        return jwt;        
    }

    @ApiOperation({summary: "Gets the JWT using a steam user ticket"}) 
    @Get("steam/user") 
    @Public()
    public async GetUserFromSteam(@Query('userID') userID: string, @Query() userTicketRaw?: string): Promise<JWTResponseDto> {
        
        if(!userID) { throw new HttpException('Missing userID', 400) }
        if(!userTicketRaw) { throw new HttpException('Missing userTicketRaw', 400) }

        const jwt = await this.authService.ValidateFromInGame(userTicketRaw, userID);
        if (!jwt) { throw new HttpException("Error validtating Steam user ticket", 500) }
        return jwt;
    }
}
