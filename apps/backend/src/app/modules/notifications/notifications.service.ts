import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import { NotificationDto, DtoFactory } from '../../dto';
import { NotificationType } from '@momentum/constants';
import { Prisma } from '@prisma/client';

export type AnnouncementData = {
  type: NotificationType.ANNOUNCEMENT;
  message: string;
};
export type WRAchievedData = {
  type: NotificationType.WR_ACHIEVED;
  runID: bigint;
};
export type MapStatusChangeData = {
  type: NotificationType.MAP_STATUS_CHANGE;
  mapID: number;
};
export type MapTestReqData = {
  type: NotificationType.MAP_TESTING_REQUEST;
  requesterID: number;
  mapID: number;
};
export type ReviewPostedData = {
  type: NotificationType.REVIEW_POSTED;
  reviewerID: number;
  mapID: number;
};
export type NotificationData =
  | AnnouncementData
  | WRAchievedData
  | MapStatusChangeData
  | MapTestReqData
  | ReviewPostedData;

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}
  async getNotifications(userID: number): Promise<NotificationDto[]> {
    const dbResponse = await this.db.notification.findMany({
      where: { targetUserID: userID },
      include: {
        user: true,
        map: true,
        run: true
      }
    });
    return dbResponse.map((x) => DtoFactory(NotificationDto, x));
  }

  async markAsRead(
    userID: number,
    notifIDs: number[],
    all: boolean
  ): Promise<void> {
    for (const notifID of notifIDs) {
      if (Number.isNaN(notifID))
        throw new BadRequestException('Invalid notification IDs');
    }
    if (all)
      await this.db.notification.deleteMany({
        where: {
          targetUserID: userID,
          type: { not: NotificationType.MAP_TESTING_REQUEST }
        }
      });
    else
      await this.db.notification.deleteMany({
        where: {
          id: { in: notifIDs },
          targetUserID: userID,
          type: { not: NotificationType.MAP_TESTING_REQUEST }
        }
      });
  }

  async sendNotifications(
    toUserIDs: number[],
    data: NotificationData,
    tx: ExtendedPrismaServiceTransaction = this.db
  ): Promise<void> {
    const newNotif: Prisma.NotificationCreateManyInput = {
      targetUserID: -1,
      type: data.type
    };
    switch (data.type) {
      case NotificationType.ANNOUNCEMENT:
        newNotif.message = data.message;
        break;
      case NotificationType.WR_ACHIEVED:
        newNotif.runID = data.runID;
        break;
      case NotificationType.MAP_STATUS_CHANGE:
        newNotif.mapID = data.mapID;
        break;
      case NotificationType.MAP_TESTING_REQUEST:
        newNotif.userID = data.requesterID;
        newNotif.mapID = data.mapID;
        break;
      case NotificationType.REVIEW_POSTED:
        newNotif.userID = data.reviewerID;
        newNotif.mapID = data.mapID;
        break;
      default:
        throw new Error(
          'Malformed data argument! Look at the types in notifications.service.ts'
        );
    }

    await tx.notification.createMany({
      data: toUserIDs.map((userID) => ({ ...newNotif, targetUserID: userID }))
    });
  }
}
