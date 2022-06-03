import { Module } from '@nestjs/common';

import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { AuthService } from './auth.service';

import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt/jwt.strategy';
import { appConfig } from '../../../config/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { SteamWebStrategy } from './steam/steam-web.strategy';
import { SteamAuthService } from './steam/steam-auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

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
        UsersModule,
        HttpModule
    ],
    controllers: [AuthController],
    providers: [AuthService, SteamAuthService, JwtAuthGuard, JwtStrategy, SteamWebStrategy],
    exports: [AuthService, SteamAuthService, JwtAuthGuard, JwtStrategy, SteamWebStrategy]
})
export class AuthModule {}
