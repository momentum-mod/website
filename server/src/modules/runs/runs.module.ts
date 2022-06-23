import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RepoModule } from '../repo/repo.module';
import { RunsRepoService } from '../repo/runs-repo.service';

@Module({
    imports: [RepoModule],
    controllers: [RunsController],
    providers: [RunsService, RunsRepoService],
    exports: [RunsService]
})
export class RunsModule {}
