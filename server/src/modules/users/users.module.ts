import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RepoModule } from '../repo/repo.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RunsModule } from '@modules/runs/runs.module';
import { RunsService } from '@modules/runs/runs.service';
import { FileStoreModule } from '../filestore/file-store.module';

@Module({
    imports: [RepoModule, HttpModule, ConfigModule, RunsModule, FileStoreModule],
    controllers: [UsersController],
    providers: [UsersService, RunsService],
    exports: [UsersService]
})
export class UsersModule {}
