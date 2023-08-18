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

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { issuer: config.get('domain') }
      }),
      inject: [ConfigService]
    }),
    UsersModule,
    DbModule.forRoot(),
    SteamModule
  ],
  controllers: [AuthController],
  providers: [
    {
      // This enables the JWT guard globally.
      provide: APP_GUARD,
      useClass: JwtGuard
    },
    JwtAuthService,
    SteamOpenIDService
  ]
})
export class AuthModule {}
