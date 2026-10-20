import { Module } from '@nestjs/common';
import { DbService } from './db.service';
import { extendedNestJsPrismaClientFactory } from './prisma.extension';
import { EXTENDED_PRISMA_SERVICE } from './db.constants';

@Module({
  providers: [
    {
      provide: EXTENDED_PRISMA_SERVICE,
      useFactory: () => extendedNestJsPrismaClientFactory(new DbService())
    }
  ],
  exports: [EXTENDED_PRISMA_SERVICE]
})
export class DbModule {}
