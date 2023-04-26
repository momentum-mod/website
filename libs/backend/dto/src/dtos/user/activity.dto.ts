import { Activity } from '@prisma/client';
import { ActivityType } from '@momentum/constants';
import { IsPositive } from 'class-validator';
import { UserDto } from './user.dto';
import { PrismaModelToDto } from '../../types';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';

export class ActivityDto implements PrismaModelToDto<Activity> {
  @IdProperty()
  readonly id: number;

  @IdProperty({
    description: 'The ID of the user the activity is associated with'
  })
  @IsPositive()
  readonly userID: number;

  @NestedProperty(UserDto, {
    description: 'The ID of the user the activity is associated with'
  })
  readonly user: UserDto;

  @EnumProperty(ActivityType)
  readonly type: ActivityType;

  @IdProperty({
    bigint: true,
    description:
      'ID of into the table of the relevant activity type e.g. Map, Run, User'
  })
  readonly data: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}
