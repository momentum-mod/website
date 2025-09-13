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
  NotificationsGetQueryDto,
  NotificationsDeleteQueryDto,
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
    @Query() query?: NotificationsGetQueryDto
  ): Promise<PagedResponseDto<NotificationDto>> {
    return this.notifsService.getNotifications(userID, query);
  }

  @Delete('/')
  @ApiOperation({ description: 'Dismisses (deletes) the given notifications.' })
  @ApiQuery({ type: NotificationsDeleteQueryDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Notifications deleted successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid notificationIDs' })
  async deleteNotifications(
    @LoggedInUser('id') userID: number,
    @Query() query: NotificationsDeleteQueryDto
  ): Promise<void> {
    return this.notifsService.deleteNotifications(userID, query);
  }
}
