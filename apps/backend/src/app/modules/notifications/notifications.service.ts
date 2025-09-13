import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import {
  NotificationDto,
  NotificationsDeleteQueryDto,
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

  async sendNotifications(
    createManyArgs: Prisma.NotificationCreateManyArgs,
    tx: ExtendedPrismaServiceTransaction = this.db
  ): Promise<void> {
    await tx.notification.createMany(createManyArgs);
  }
}
