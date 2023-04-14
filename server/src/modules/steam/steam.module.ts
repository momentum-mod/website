import { Module } from '@nestjs/common';
import { SteamService } from './steam.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    providers: [SteamService],
    exports: [SteamService]
})
export class SteamModule {}
