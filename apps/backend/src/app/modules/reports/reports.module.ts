import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DbModule } from '../database/db.module';

@Module({
  imports: [DbModule],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
