import { Module } from '@nestjs/common';
import { XpSystemsService } from './xp-systems.service';

@Module({
  providers: [XpSystemsService],
  exports: [XpSystemsService]
})
export class XpSystemsModule {}
