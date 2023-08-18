import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ExtendedPrismaClient } from '@momentum/db';
import { EXTENDED_PRISMA_SERVICE } from '../src/app/modules/database/db.constants';

export type PrismaMock<T = ExtendedPrismaClient> = DeepMockProxy<{
  // Omit some crap from the client that causes a circular reference type error
  // between Prisma and jest-mock-extended
  // https://github.com/prisma/prisma/issues/10203#issuecomment-1451897646
  [K in keyof T]: Omit<T[K], 'groupBy'>;
}>;

export const PRISMA_MOCK_PROVIDER = {
  provide: EXTENDED_PRISMA_SERVICE,
  useValue: mockDeep<ExtendedPrismaClient>() as unknown as PrismaMock
};
