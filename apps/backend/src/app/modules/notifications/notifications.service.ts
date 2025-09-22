import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import {
  NotificationsDeleteQueryDto,
  NotificationsGetQueryDto,
  AnnouncementNotificationDto,
  DtoFactory,
  WRAchievedNotificationDto,
  MapStatusChangeNotificationDto,
  MapTestingInviteNotificationDto,
  MapReviewPostedNotificationDto,
  MapReviewCommentPostedNotificationDto,
  NotificationsMarkReadQueryDto
} from '../../dto';
import {
  MapStatus,
  NotificationType,
  PagedNotificationResponse
} from '@momentum/constants';
import { Prisma } from '@momentum/db';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  async getNotifications(
    userID: number,
    query: NotificationsGetQueryDto
  ): Promise<PagedNotificationResponse> {
    const [data, count] = await this.db.notification.findManyAndCount({
      where: { notifiedUserID: userID },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        map: true,
        review: true,
        reviewComment: true
      },
      skip: query.skip,
      take: query.take
    });

    const totalUnreadCount = await this.db.notification.count({
      where: { notifiedUserID: userID, isRead: false }
    });

    return {
      totalCount: count,
      returnCount: data.length,
      totalUnreadCount,
      data: data.map((item) => {
        const baseNotification = {
          id: item.id,
          type: item.type,
          isRead: item.isRead,
          createdAt: item.createdAt
        };
        switch (item.type) {
          case NotificationType.ANNOUNCEMENT: {
            return DtoFactory(AnnouncementNotificationDto, {
              ...baseNotification,
              message: (item.json as { message: string }).message
            });
          }
          case NotificationType.WR_ACHIEVED: {
            return DtoFactory(WRAchievedNotificationDto, {
              // TODO more fields when adding this, see models.ts
              ...baseNotification,
              map: item.map
            });
          }
          case NotificationType.MAP_STATUS_CHANGE: {
            const jsonField = item.json as {
              oldStatus: MapStatus;
              newStatus: MapStatus;
            };
            return DtoFactory(MapStatusChangeNotificationDto, {
              ...baseNotification,
              map: item.map,
              oldStatus: jsonField.oldStatus,
              newStatus: jsonField.newStatus,
              changedBy: item.user
            });
          }
          case NotificationType.MAP_TESTING_INVITE: {
            return DtoFactory(MapTestingInviteNotificationDto, {
              ...baseNotification,
              map: item.map,
              invitedBy: item.user
            });
          }
          case NotificationType.MAP_REVIEW_POSTED: {
            return DtoFactory(MapReviewPostedNotificationDto, {
              ...baseNotification,
              map: item.map,
              review: item.review,
              reviewer: item.user
            });
          }
          case NotificationType.MAP_REVIEW_COMMENT_POSTED: {
            return DtoFactory(MapReviewCommentPostedNotificationDto, {
              ...baseNotification,
              map: item.map,
              review: item.review,
              reviewComment: item.reviewComment,
              reviewCommenter: item.user
            });
          }
        }
      })
    };
  }

  async deleteNotifications(
    userID: number,
    query: NotificationsDeleteQueryDto
  ): Promise<void> {
    if (query.all) {
      await this.db.notification.deleteMany({
        where: {
          notifiedUserID: userID,
          // Don't delete Map Testing notifications, as those are handled by
          // MapTestInviteService. User needs to explicitly accept/reject.
          type: { not: NotificationType.MAP_TESTING_INVITE }
        }
      });
    } else if (query.notificationIDs) {
      await this.db.notification.deleteMany({
        where: {
          id: { in: query.notificationIDs },
          notifiedUserID: userID,
          type: { not: NotificationType.MAP_TESTING_INVITE }
        }
      });
    } else {
      throw new BadRequestException(
        'Either notificationIDs or all field must be present in request'
      );
    }
  }

  async markNotificationsAsRead(
    userID: number,
    query: NotificationsMarkReadQueryDto
  ): Promise<void> {
    if (query.all) {
      await this.db.notification.updateMany({
        where: { notifiedUserID: userID },
        data: { isRead: true }
      });
    } else if (query.notificationIDs) {
      await this.db.notification.updateMany({
        where: {
          notifiedUserID: userID,
          id: { in: query.notificationIDs }
        },
        data: { isRead: true }
      });
    } else {
      throw new BadRequestException(
        'Either notificationIDs or all field must be present in request'
      );
    }
  }

  async sendNotifications(
    createManyArgs: Prisma.NotificationCreateManyArgs,
    tx: ExtendedPrismaServiceTransaction = this.db
  ): Promise<void> {
    await tx.notification.createMany(createManyArgs);
  }
}
