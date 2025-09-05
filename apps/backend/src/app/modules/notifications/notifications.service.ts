import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import {
  NotificationDto,
  NotificationsMarkAsReadQueryDto,
  PagedResponseDto,
  NotificationsGetQueryDto,
  AnnouncementNotificationDto,
  DtoFactory,
  WRAchievedNotificationDto,
  MapStatusChangeNotificationDto,
  MapTestingInviteNotificationDto,
  MapReviewPostedNotificationDto,
  MapReviewCommentPostedNotificationDto
} from '../../dto';
import { MapStatus, NotificationType } from '@momentum/constants';
import { Prisma } from '@momentum/db';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}
  async getNotifications(
    userID: number,
    query: NotificationsGetQueryDto
  ): Promise<PagedResponseDto<NotificationDto>> {
    // Only a couple of these fields are on a notification at a time
    // However, the include will only fetch those fields if they exist
    // This is faster than explicitly checking
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

    return {
      totalCount: count,
      returnCount: data.length,
      data: data.map((item) => {
        switch (item.type) {
          case NotificationType.ANNOUNCEMENT: {
            return DtoFactory(AnnouncementNotificationDto, {
              id: item.id,
              type: item.type,
              message: (item.json as { message: string }).message,
              createdAt: item.createdAt
            });
          }
          case NotificationType.WR_ACHIEVED: {
            return DtoFactory(WRAchievedNotificationDto, {
              // TODO more fields when adding this, see models.ts
              id: item.id,
              type: item.type,
              map: item.map,
              createdAt: item.createdAt
            });
          }
          case NotificationType.MAP_STATUS_CHANGE: {
            const jsonField = item.json as {
              oldStatus: MapStatus;
              newStatus: MapStatus;
            };
            return DtoFactory(MapStatusChangeNotificationDto, {
              id: item.id,
              type: item.type,
              map: item.map,
              oldStatus: jsonField.oldStatus,
              newStatus: jsonField.newStatus,
              changedBy: item.user,
              createdAt: item.createdAt
            });
          }
          case NotificationType.MAP_TESTING_INVITE: {
            return DtoFactory(MapTestingInviteNotificationDto, {
              id: item.id,
              type: item.type,
              map: item.map,
              invitedBy: item.user,
              createdAt: item.createdAt
            });
          }
          case NotificationType.MAP_REVIEW_POSTED: {
            return DtoFactory(MapReviewPostedNotificationDto, {
              id: item.id,
              type: item.type,
              map: item.map,
              review: item.review,
              reviewer: item.user,
              createdAt: item.createdAt
            });
          }
          case NotificationType.MAP_REVIEW_COMMENT_POSTED: {
            return DtoFactory(MapReviewCommentPostedNotificationDto, {
              id: item.id,
              type: item.type,
              map: item.map,
              review: item.review,
              reviewComment: item.reviewComment,
              reviewCommenter: item.user,
              createdAt: item.createdAt
            });
          }
        }
      })
    };
  }

  async markAsRead(
    userID: number,
    query: NotificationsMarkAsReadQueryDto
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
    } else {
      if (!query.notifIDs)
        throw new BadRequestException('notifIDs required if all is false');
      await this.db.notification.deleteMany({
        where: {
          id: { in: query.notifIDs },
          notifiedUserID: userID,
          type: { not: NotificationType.MAP_TESTING_INVITE }
        }
      });
    }
  }

  async sendNotifications(
    createManyArgs: Prisma.NotificationCreateManyArgs,
    tx: ExtendedPrismaServiceTransaction = this.db
  ): Promise<void> {
    await tx.notification.createMany(createManyArgs);
  }
}
