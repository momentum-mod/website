import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { SteamWebStrategy } from '@modules/auth/strategy/steam-web.strategy';
import { SteamAuthService } from '@modules/auth/steam-auth.service';
import { AuthController } from '@modules/auth/auth.controller';
import { UsersModule } from '@modules/users/users.module';
import { RepoModule } from '@modules/repo/repo.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SteamModule } from '@modules/steam/steam.module';

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
        RepoModule,
        SteamModule
    ],
    controllers: [AuthController],
    providers: [AuthService, SteamAuthService, JwtAuthGuard, JwtStrategy, SteamWebStrategy],
    exports: [AuthService, SteamAuthService, JwtAuthGuard, JwtStrategy, SteamWebStrategy]
})
export class AuthModule {}
