import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepoService } from '../repo/users-repo.service';
import { UsersController } from './users.controller';
import { RepoModule } from '../repo/repo.module';
import { MapsRepoService } from '../repo/maps-repo.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [RepoModule, HttpModule],
    controllers: [UsersController],
    providers: [UsersService, UsersRepoService, MapsRepoService],
    exports: [UsersService]
})
export class UsersModule {}
