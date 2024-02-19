import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { LoggedInUser } from '../../decorators';
import { NotificationDto } from '../../dto';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notifsService: NotificationsService) {}

  @Get('/')
  @ApiOperation({
    description:
      'Fetches the notifications sent to a user. Notifications are deleted after being fetched.'
  })
  @ApiOkResponse({ description: "List of the user's notifications." })
  async getNotifications(
    @LoggedInUser('id') userID: number
  ): Promise<NotificationDto[]> {
    return this.notifsService.getNotifications(userID);
  }
}
