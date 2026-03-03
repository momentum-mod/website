import { forwardRef, Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';
import { MapsModule } from '../maps/maps.module';
import { SessionController } from './session.controller';
import { RunSessionService } from './run/run-session.service';
import { KillswitchModule } from '../killswitch/killswitch.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { RunsModule } from '../runs/runs.module';

@Module({
  imports: [
    DbModule,
    FileStoreModule,
    ValkeyModule,
    XpSystemsModule,
    forwardRef(() => MapsModule),
    KillswitchModule,
    forwardRef(() => RunsModule)
  ],
  controllers: [SessionController],
  providers: [RunSessionService]
})
export class SessionModule {}
