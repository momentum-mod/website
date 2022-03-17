import { Module } from '@nestjs/common';
import { MapsRepo } from './maps.repo';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [MapsController],
    providers: [MapsService, MapsRepo],
    exports: [MapsService, MapsRepo]
})
export class MapsModule {}
