import { mockDeep } from '@momentum/test-utils';
import { ExtendedPrismaClient } from '@momentum/db';
import { EXTENDED_PRISMA_SERVICE } from '../src/app/modules/database/db.constants';

export type PrismaMock<T = ExtendedPrismaClient> = {
  [K in keyof T]: any;
};

export const PRISMA_MOCK_PROVIDER = {
  provide: EXTENDED_PRISMA_SERVICE,
  useValue: mockDeep<ExtendedPrismaClient>() as unknown as PrismaMock
};
