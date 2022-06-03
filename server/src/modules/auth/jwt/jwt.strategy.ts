import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWTPayload } from '../auth.service';
import { appConfig } from '../../../../config/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: appConfig.accessToken.secret
        });
    }

    /*
     * @summary Is this a valid JWT?
     */
    async validate(validationPayload: JWTPayload) {
        // if its valid then this will hit
        return this.usersService.Get(validationPayload.id);
    }
}
