import { forwardRef, Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';
import { MapsModule } from '../maps/maps.module';
import { SessionController } from './session.controller';
import { RunSessionService } from './run/run-session.service';

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
