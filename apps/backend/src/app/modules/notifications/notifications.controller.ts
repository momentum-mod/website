import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
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
  @Delete('/markAsRead')
  @ApiOperation({
    description: 'Marks the given notifications as read.'
  })
  @ApiBody({
    type: String,
    description: 'Comma-separated list of notification ids or the word "all"',
    required: true
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Notifications marked as read successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  async markNotificationsAsRead(
    @LoggedInUser('id') userID: number,
    @Query('notifIDs') notifIDs: string
  ): Promise<void> {
    if (!notifIDs) throw new BadRequestException('Invalid notification IDs');
    if (notifIDs === 'all')
      return this.notifsService.markAsRead(userID, [], true);
    else {
      return this.notifsService.markAsRead(
        userID,
        notifIDs.split(',').map((x) => Number.parseInt(x)),
        false
      );
    }
  }
}
