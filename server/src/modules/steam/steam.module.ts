import { Module } from '@nestjs/common';
import { SteamService } from './steam.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [HttpModule, ConfigModule],
    providers: [SteamService],
    exports: [SteamService]
})
export class SteamModule {}
