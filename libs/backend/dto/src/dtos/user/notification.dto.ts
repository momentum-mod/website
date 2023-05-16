import { Notification, UpdateNotification } from '@momentum/types';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { ActivityDto } from './activity.dto';
import { UserDto } from './user.dto';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';

export class NotificationDto implements Notification {
  @IdProperty()
  readonly id: number;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the notification has been read by the user'
  })
  @IsBoolean()
  readonly read: boolean;

  @IdProperty()
  readonly userID: number;

  @NestedProperty(UserDto)
  readonly user: UserDto;

  @IdProperty()
  readonly activityID: number;

  @NestedProperty(ActivityDto, {
    description: 'The activity that the notification is about'
  })
  readonly activity: ActivityDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class UpdateNotificationDto
  extends PickType(NotificationDto, ['read'] as const)
  implements UpdateNotification {}
