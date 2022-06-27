import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { appConfig } from '../../../config/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { SteamWebStrategy } from './strategy/steam-web.strategy';
import { SteamAuthService } from './steam-auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { UsersRepoService } from '../repo/users-repo.service';
import { RepoModule } from '../repo/repo.module';

@Module({
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt'
        }),
        JwtModule.register({
            secret: appConfig.accessToken.secret,
            signOptions: {
                expiresIn: appConfig.accessToken.expTime
            }
        }),
        // TODO: Straight after repo refactor, untangle auth for user completely.
        UsersModule,
        HttpModule,
        RepoModule
    ],
    controllers: [AuthController],
    providers: [AuthService, SteamAuthService, JwtAuthGuard, JwtStrategy, SteamWebStrategy, UsersRepoService],
    exports: [AuthService, SteamAuthService, JwtAuthGuard, JwtStrategy, SteamWebStrategy]
})
export class AuthModule {}
