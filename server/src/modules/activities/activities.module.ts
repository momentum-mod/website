import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { RepoModule } from '../repo/repo.module';

@Module({
    imports: [RepoModule],
    controllers: [ActivitiesController],
    providers: [ActivitiesService]
})
export class ActivitiesModule {}
