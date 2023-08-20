import { forwardRef, Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { SteamModule } from '../steam/steam.module';
import { RanksService } from './ranks.service';
import { MapsModule } from '../maps/maps.module';

@Module({
  imports: [DbModule.forRoot(), SteamModule, forwardRef(() => MapsModule)],
  providers: [RanksService],
  exports: [RanksService]
})
export class RanksModule {}
