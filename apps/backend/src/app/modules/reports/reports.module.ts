import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DbModule.forRoot()],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
