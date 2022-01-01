import { Module } from '@nestjs/common';

import { AuthController } from './auth/auth.controller';
import { UsersController } from './controllers/users.controller';
import { MapsController } from './controllers/maps.controller';

import { ServiceModule } from './services/sevices.module';
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
  ]
})
export class AppModule {}
