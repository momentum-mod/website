import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWTPayload } from '../auth.service';
import { appConfig } from '../../../../config/config';
import { UsersRepoService } from '../../repo/users-repo.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly userRepo: UsersRepoService) {
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
        // TODO: move after repo refactor
        return this.userRepo.get(validationPayload.id);
    }
}
