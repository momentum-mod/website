import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { RepoModule } from '../repo/repo.module';

@Module({
    imports: [RepoModule],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService]
})
export class ReportsModule {}
