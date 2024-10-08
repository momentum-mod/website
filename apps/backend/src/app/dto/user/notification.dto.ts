﻿import {
  DateString,
  Notification,
  UpdateNotification
} from '@momentum/constants';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../decorators';
import { ActivityDto } from './activity.dto';
import { UserDto } from './user.dto';

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
  readonly createdAt: DateString;

  @UpdatedAtProperty()
  readonly updatedAt: DateString;
}

export class UpdateNotificationDto
  extends PickType(NotificationDto, ['read'] as const)
  implements UpdateNotification {}
