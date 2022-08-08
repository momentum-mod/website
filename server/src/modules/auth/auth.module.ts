import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { SteamWebStrategy } from './strategy/steam-web.strategy';
import { SteamAuthService } from './steam-auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RepoModule } from '../repo/repo.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt'
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                secret: config.get('accessToken.secret'),
                signOptions: {
                    expiresIn: config.get('accessToken.expTime')
                }
            }),
            inject: [ConfigService]
        }),
        ConfigModule,
        UsersModule,
        HttpModule,
        RepoModule
    ],
    controllers: [AuthController],
    providers: [AuthService, SteamAuthService, JwtAuthGuard, JwtStrategy, SteamWebStrategy],
    exports: [AuthService, SteamAuthService, JwtAuthGuard, JwtStrategy, SteamWebStrategy]
})
export class AuthModule {}
