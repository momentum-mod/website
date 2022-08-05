import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWTPayload } from '../auth.service';
import { appConfig } from '../../../../config/config';
import { UsersRepoService } from '../../repo/users-repo.service';
import { User } from '@prisma/client';

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
    validate(validationPayload: JWTPayload): Promise<User> {
        return this.userRepo.get(validationPayload.id);
    }
}
