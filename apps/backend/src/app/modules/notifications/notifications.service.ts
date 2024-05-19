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
}
