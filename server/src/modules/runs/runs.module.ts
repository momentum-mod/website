import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RepoModule } from '../repo/repo.module';

@Module({
    imports: [RepoModule],
    controllers: [RunsController],
    providers: [RunsService],
    exports: [RunsService]
})
export class RunsModule {}
