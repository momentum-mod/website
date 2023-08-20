import { forwardRef, Module } from '@nestjs/common';
import { RunSessionService } from './run/run-session.service';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';
import { SessionController } from './session.controller';
import { MapsModule } from '../maps/maps.module';

@Module({
  imports: [
    DbModule.forRoot(),
    FileStoreModule,
    XpSystemsModule,
    forwardRef(() => MapsModule)
  ],
  controllers: [SessionController],
  providers: [RunSessionService]
})
export class SessionModule {}
