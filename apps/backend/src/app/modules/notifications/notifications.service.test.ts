import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, resetDeepMockCalls } from '@momentum/test-utils';
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

  afterEach(() => {
    mock.restoreAll();
    resetDeepMockCalls();
  });

  it('should be defined', () => {
    assert.notStrictEqual(service, undefined);
  });

  // TODO extend, e.g. when sendNotifications does other stuff than just db calls.
});
