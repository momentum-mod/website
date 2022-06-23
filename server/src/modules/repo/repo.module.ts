import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RunsRepoService } from './runs-repo.service';
import { UsersRepoService } from './users-repo.service';
import { MapsRepoService } from './maps-repo.service';

@Module({
    providers: [PrismaService, UsersRepoService, MapsRepoService, RunsRepoService],
    exports: [PrismaService, UsersRepoService, MapsRepoService, RunsRepoService]
})
export class RepoModule {}
