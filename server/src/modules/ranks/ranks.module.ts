import { Module } from '@nestjs/common';
import { RanksService } from './ranks.service';
import { RepoModule } from '@modules/repo/repo.module';
import { SteamModule } from '@modules/steam/steam.module';

@Module({
  imports: [RepoModule, SteamModule],
  providers: [RanksService],
  exports: [RanksService]
})
export class RanksModule {}
