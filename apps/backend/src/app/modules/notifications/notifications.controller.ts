import {
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
  ApiNoContentResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { LoggedInUser } from '../../decorators';
import {
  ApiOkPagedResponse,
  NotificationDto,
  NotifsGetQueryDto,
  NotifsMarkAsReadQueryDto,
  PagedResponseDto
} from '../../dto';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notifsService: NotificationsService) {}

  @Get('/')
  @ApiOperation({ description: 'Fetches the notifications sent to a user.' })
  @ApiOkPagedResponse(NotificationDto, {
    description: "Paginated list of the user's notifications."
  })
  async getNotifications(
    @LoggedInUser('id') userID: number,
    @Query() query?: NotifsGetQueryDto
  ): Promise<PagedResponseDto<NotificationDto>> {
    return this.notifsService.getNotifications(userID, query);
  }

  @Delete('/markAsRead')
  @ApiOperation({ description: 'Marks the given notifications as read.' })
  @ApiQuery({ type: NotifsMarkAsReadQueryDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Notifications marked as read successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid notifIDs' })
  async markNotificationsAsRead(
    @LoggedInUser('id') userID: number,
    @Query() query: NotifsMarkAsReadQueryDto
  ): Promise<void> {
    return this.notifsService.markAsRead(userID, query);
  }
}
