import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { SteamWebStrategy } from '@modules/auth/strategy/steam-web.strategy';
import { SteamAuthService } from '@modules/auth/steam-auth.service';
import { AuthController } from '@modules/auth/auth.controller';
import { UsersModule } from '@modules/users/users.module';
import { RepoModule } from '@modules/repo/repo.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@Module({
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt'
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                secret: config.get('accessToken.secret'),
                signOptions: { issuer: config.get('domain') }
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
