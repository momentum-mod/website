import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { RepoModule } from '../repo/repo.module';
import { UsersRepoService } from '../repo/users-repo.service';

@Module({
    imports: [RepoModule],
    controllers: [ReportsController],
    providers: [ReportsService, UsersRepoService],
    exports: [ReportsService]
})
export class ReportsModule {}
