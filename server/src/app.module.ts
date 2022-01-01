import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

import { AuthController } from './auth/auth.controller';
import { UsersController } from './controllers/users.controller';
import { MapsController } from './controllers/maps.controller';

import { ServiceModule } from './services/sevices.module';
import { AuthModule } from './auth/auth.module';
import { JsonBodyMiddleware } from './middlewares/json-body.middleware';
import { RawBodyMiddleware } from './middlewares/raw-body.middleware';

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
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
        .apply(RawBodyMiddleware)
        .forRoutes({
            path: '/auth/steam/user',
            method: RequestMethod.POST,
        })
        .apply(JsonBodyMiddleware)
        .forRoutes('*');
}
}

