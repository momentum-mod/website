import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import {
  NotificationDto,
  NotifsMarkAsReadQueryDto,
  PagedResponseDto,
  NotifsGetQueryDto
} from '../../dto';
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
  type: NotificationType.MAP_TEST_INVITE;
  requesterID: number;
  mapID: number;
};
export type ReviewPostedData = {
  type: NotificationType.REVIEW_POSTED;
  reviewerID: number;
  mapID: number;
  reviewID: number;
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
  async getNotifications(
    userID: number,
    query: NotifsGetQueryDto
  ): Promise<PagedResponseDto<NotificationDto>> {
    // Only a couple of these fields are on a notification at a time
    // However, the include will only fetch those fields if they exist
    // This is faster than explicitly checking
    const dbResponse = await this.db.notification.findManyAndCount({
      where: { notifiedUserID: userID },
      include: {
        user: true,
        map: true,
        run: true,
        review: true
      },
      skip: query.skip,
      take: query.take
    });
    return new PagedResponseDto(NotificationDto, dbResponse);
  }

  async markAsRead(
    userID: number,
    query: NotifsMarkAsReadQueryDto
  ): Promise<void> {
    if (query.all) {
      await this.db.notification.deleteMany({
        where: {
          notifiedUserID: userID,
          type: { not: NotificationType.MAP_TEST_INVITE }
        }
      });
    } else {
      if (!query.notifIDs)
        throw new BadRequestException('notifIDs required if all is false');
      for (const notifID of query.notifIDs)
        if (Number.isNaN(notifID))
          throw new BadRequestException('notifIDs must contain numbers only');
      await this.db.notification.deleteMany({
        where: {
          id: { in: query.notifIDs },
          notifiedUserID: userID,
          type: { not: NotificationType.MAP_TEST_INVITE }
        }
      });
    }
  }

  async sendNotifications(
    toUserIDs: number[],
    data: NotificationData,
    tx: ExtendedPrismaServiceTransaction = this.db
  ): Promise<void> {
    const newNotif: Partial<Prisma.NotificationCreateManyInput> = {
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
      case NotificationType.MAP_TEST_INVITE:
        newNotif.userID = data.requesterID;
        newNotif.mapID = data.mapID;
        break;
      case NotificationType.REVIEW_POSTED:
        newNotif.userID = data.reviewerID;
        newNotif.mapID = data.mapID;
        newNotif.reviewID = data.reviewID;
        break;
      default:
        throw new Error(
          'Malformed data argument! Look at the types in notifications.service.ts'
        );
    }

    await tx.notification.createMany({
      data: toUserIDs.map(
        (userID) =>
          ({
            ...newNotif,
            notifiedUserID: userID
          }) as Prisma.NotificationCreateManyInput
      )
    });
  }
}
