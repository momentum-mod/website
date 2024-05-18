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
}
