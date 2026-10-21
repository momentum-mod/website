import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportDiscordNotifications } from './report-discord-notifications.service';

@Module({
  imports: [DbModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportDiscordNotifications]
})
export class ReportsModule {}
