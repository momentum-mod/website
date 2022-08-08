import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWTPayload } from '../auth.service';
import { UsersRepoService } from '../../repo/users-repo.service';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly userRepo: UsersRepoService, private readonly config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get('accessToken.secret')
        });
    }

    /*
     * @summary Is this a valid JWT?
     */
    validate(validationPayload: JWTPayload): Promise<User> {
        return this.userRepo.get(validationPayload.id);
    }
}
