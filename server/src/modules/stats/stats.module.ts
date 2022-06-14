import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StatsRepo } from './stats.repo';

@Module({
    imports: [PrismaModule],
    controllers: [StatsController],
    providers: [StatsService, StatsRepo],
    exports: [StatsService]
})
export class StatsModule {}
