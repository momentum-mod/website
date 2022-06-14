import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsRepo } from './reports.repo';

@Module({
    imports: [PrismaModule],
    controllers: [ReportsController],
    providers: [ReportsService, ReportsRepo],
    exports: [ReportsService]
})
export class ReportsModule {}
