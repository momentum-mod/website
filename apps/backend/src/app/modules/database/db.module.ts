import { DynamicModule, Module } from '@nestjs/common';
import { DbService } from './db.service';
import { extendedNestJsPrismaClientFactory } from './prisma.extension';
import { EXTENDED_PRISMA_SERVICE } from './db.constants';

@Module({})
export class DbModule {
  static forRoot(): DynamicModule {
    return {
      module: DbModule,
      providers: [
        {
          provide: EXTENDED_PRISMA_SERVICE,
          useFactory: () => extendedNestJsPrismaClientFactory(new DbService())
        }
      ],
      exports: [EXTENDED_PRISMA_SERVICE]
    };
  }
}
