import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { RepoModule } from '../repo/repo.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [RepoModule, ConfigModule],
    controllers: [ReportsController],
    providers: [ReportsService]
})
export class ReportsModule {}
