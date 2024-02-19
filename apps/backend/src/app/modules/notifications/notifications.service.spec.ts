import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import {
  NotificationData,
  NotificationsService
} from './notifications.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { NotificationType } from '@momentum/constants';

describe('NotificationsService', () => {
  let service: NotificationsService, db: PrismaMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<NotificationsService>(NotificationsService);
    db = module.get(EXTENDED_PRISMA_SERVICE);
  });

  afterEach(() => jest.resetAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('should send an ANNOUNCEMENT notification', async () => {
    const toUserID = 1;
    const data: NotificationData = {
      type: NotificationType.ANNOUNCEMENT,
      message: 'hiii :3'
    };

    await service.sendNotifications([toUserID], data);

    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          type: data.type,
          targetUserID: toUserID,
          message: data.message
        }
      ]
    });
  });
  it('should send a WR_ACHIEVED notification', async () => {
    const toUserID = 1;
    const data: NotificationData = {
      type: NotificationType.WR_ACHIEVED,
      runID: 123n
    };

    await service.sendNotifications([toUserID], data);

    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          type: data.type,
          targetUserID: toUserID,
          runID: data.runID
        }
      ]
    });
  });
  it('should send a MAP_STATUS_CHANGE notification', async () => {
    const toUserID = 1;
    const data: NotificationData = {
      type: NotificationType.MAP_STATUS_CHANGE,
      mapID: 456
    };

    await service.sendNotifications([toUserID], data);

    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          type: data.type,
          targetUserID: toUserID,
          mapID: data.mapID
        }
      ]
    });
  });
  it('should send a MAP_TESTING_REQUEST notification', async () => {
    const toUserID = 1;
    const data: NotificationData = {
      type: NotificationType.MAP_TESTING_REQUEST,
      requesterID: 119,
      mapID: 456
    };

    await service.sendNotifications([toUserID], data);

    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          type: data.type,
          targetUserID: toUserID,
          userID: data.requesterID,
          mapID: data.mapID
        }
      ]
    });
  });
});
