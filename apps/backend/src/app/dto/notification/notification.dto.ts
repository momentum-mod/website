import { AbstractNotification, NotificationType } from '@momentum/constants';
import { EnumProperty, IdProperty } from '../decorators';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto implements AbstractNotification<NotificationType> {
  @IdProperty()
  readonly id: number;

  @EnumProperty(NotificationType)
  readonly type: NotificationType;
}

export class AnnouncementNotificationDto extends NotificationDto {
  @ApiProperty()
  @IsString()
  readonly message: string;
}

// TODO glyph: implement DTOS for rest of models, then finish stuff
// in getNotifications creating instances of each
