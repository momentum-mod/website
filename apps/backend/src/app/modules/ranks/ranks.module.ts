import { Module } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { SteamModule } from '../steam/steam.module';
import { RanksService } from './ranks.service';

@Module({
  imports: [RepoModule, SteamModule],
  providers: [RanksService],
  exports: [RanksService]
})
export class RanksModule {}
