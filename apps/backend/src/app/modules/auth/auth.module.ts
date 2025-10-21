import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { DbModule } from '../database/db.module';
import { SteamModule } from '../steam/steam.module';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt/jwt.guard';
import { JwtAuthService } from './jwt/jwt-auth.service';
import { SteamOpenIDService } from './steam/steam-openid.service';
import { LimitedGuard } from './limited.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (config: ConfigService) => ({
        secret: config.getOrThrow('jwt.secret'),
        signOptions: { issuer: config.getOrThrow('url.backend') }
      }),
      inject: [ConfigService]
    }),
    UsersModule,
    DbModule,
    SteamModule
  ],
  controllers: [AuthController],
  providers: [
    {
      // This enables the JWT guard globally.
      provide: APP_GUARD,
      useClass: JwtGuard
    },
    {
      provide: APP_GUARD,
      useClass: LimitedGuard
    },
    JwtAuthService,
    SteamOpenIDService
  ]
})
export class AuthModule {}
