import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { KillswitchService } from './killswitch.service';

@Module({
  imports: [DbModule.forRoot()],
  providers: [KillswitchService],
  exports: [KillswitchService]
})
export class KillswitchModule {}
