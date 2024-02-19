import { Inject, Injectable } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { NotificationDto, DtoFactory } from '../../dto';
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
}
