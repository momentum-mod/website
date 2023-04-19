import { Module } from '@nestjs/common';
import { AuthController } from '@modules/auth/auth.controller';
import { JwtAuthService } from '@modules/auth/jwt/jwt-auth.service';
import { JwtGuard } from '@modules/auth/jwt/jwt.guard';
import { SteamModule } from '@modules/steam/steam.module';
import { UsersModule } from '@modules/users/users.module';
import { RepoModule } from '@modules/repo/repo.module';
import { ConfigService } from '@nestjs/config';
import { SteamOpenIDService } from '@modules/auth/steam/steam-openid.service';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

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
    RepoModule,
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
