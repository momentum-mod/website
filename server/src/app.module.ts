import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { MapsController } from './controllers/maps.controller';

import { ServiceModule } from './services/sevices.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ 
    ServiceModule,
    AuthModule
  ],
  controllers: [
    AuthController,
    UsersController,
    MapsController
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ]
})
export class AppModule {}
