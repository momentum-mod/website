import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { SteamModule } from '../steam/steam.module';
import { RanksService } from './ranks.service';

@Module({
  imports: [DbModule.forRoot(), SteamModule],
  providers: [RanksService],
  exports: [RanksService]
})
export class RanksModule {}
