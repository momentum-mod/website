import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { NotificationsService } from './notifications.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';

describe('NotificationsService', () => {
  let service: NotificationsService, _db: PrismaMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<NotificationsService>(NotificationsService);
    _db = module.get(EXTENDED_PRISMA_SERVICE);
  });

  afterEach(() => jest.resetAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO extend, e.g. when sendNotifications does other stuff than just db calls.
});
