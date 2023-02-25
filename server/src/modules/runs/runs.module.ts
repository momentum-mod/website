import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RepoModule } from '../repo/repo.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [RepoModule, ConfigModule],
    controllers: [RunsController],
    providers: [RunsService],
    exports: [RunsService]
})
export class RunsModule {}
