import { HttpService } from "@nestjs/axios";
import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { User } from "@prisma/client";
import { appConfig } from "config/config";
import { lastValueFrom, map } from "rxjs";
import { UsersService } from "src/services/users.service";

@Injectable()
export class SteamAuthService {

    constructor(
        private readonly userService: UsersService,
        private readonly http: HttpService
    ){}

    
    async ValidateFromInGame(requestBody: any, steamIDToVerify: string): Promise<User> {
		const userTicket = Buffer.from(requestBody, 'utf8').toString('hex');

        const requestConfig = {
            params: {
                key: appConfig.steam.webAPIKey,
                appid: appConfig.appID,
                ticket: userTicket
            }
        }

        console.log(requestConfig);

        const sres = await lastValueFrom(
            this.http.get<any>('https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/',
            requestConfig).pipe(
              map((res) => {
                return res.data;
              }),
            ),
        );
        
        if(!sres) { throw new HttpException('Bad Request', 400); }

        console.log(sres);

        if (sres.response.error) {
            throw new HttpException('Bad Request', 400);
            // Bad request, and not sending the error object just in case of hidden bans
        }

        if (sres.response.params.result !== 'OK') { throw new HttpException(JSON.stringify(sres), 500) } // TODO parse the error? 

        if (steamIDToVerify !== sres.response.params.steamid) { throw new UnauthorizedException(); }// Generate an error here
        
        const user = await this.userService.FindOrCreateFromGame(steamIDToVerify);

        if(!user) { throw new HttpException('Could not get or create user', 500) }

        return user;                            
    }

    async ValidateFromSteamWeb(openID: any, profile: any): Promise<User> {
        if (profile._json.profilestate !== 1) {
            throw new HttpException('We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!', 400);
        }

        const user = await this.userService.FindOrCreateFromWeb(openID);

        if(!user) { throw new HttpException('Could not get or create user', 500) }

        return user;
    }
}
