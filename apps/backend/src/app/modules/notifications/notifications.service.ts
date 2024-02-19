import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { NotificationDto, DtoFactory } from '../../dto';
import { NotificationType } from '@momentum/constants';
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
}
