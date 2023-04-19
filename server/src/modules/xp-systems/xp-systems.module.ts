import { Module } from '@nestjs/common';
import { XpSystemsService } from './xp-systems.service';
import { RepoModule } from '../repo/repo.module';

@Module({
  imports: [RepoModule],
  providers: [XpSystemsService],
  exports: [XpSystemsService]
})
export class XpSystemsModule {}
