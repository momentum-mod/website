import { Module } from '@nestjs/common';
import { SteamService } from './steam.service';

@Module({
  providers: [SteamService],
  exports: [SteamService]
})
export class SteamModule {}
