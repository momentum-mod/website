import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RunsRepo } from './runs.repo';

@Module({
    imports: [PrismaModule],
    controllers: [RunsController],
    providers: [RunsService, RunsRepo],
    exports: [RunsService]
})
export class RunsModule {}
