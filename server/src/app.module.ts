import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module';
import { JsonBodyMiddleware } from './middlewares/json-body.middleware';
import { RawBodyMiddleware } from './middlewares/raw-body.middleware';
import { MapsModule } from './modules/maps/maps.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
    imports: [UsersModule, MapsModule, AuthModule, HealthModule, MetricsModule],
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
