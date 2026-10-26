import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportDiscordNotifications } from './report-discord-notifications.service';
import { BansService } from './bans.service';

@Module({
  imports: [DbModule, WebsocketsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportDiscordNotifications, BansService],
  exports: [BansService]
})
export class ReportsModule {}
