import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivitiesRepo } from './activities.repo';

@Module({
    imports: [PrismaModule],
    controllers: [ActivitiesController],
    providers: [ActivitiesService, ActivitiesRepo],
    exports: [ActivitiesService]
})
export class ActivitiesModule {}
