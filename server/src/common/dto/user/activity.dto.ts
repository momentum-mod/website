import { Activity } from '@prisma/client';
import { ActivityType } from '../../enums/activity.enum';
import { IsPositive } from 'class-validator';
import { UserDto } from './user.dto';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  PrismaModelToDto,
  UpdatedAtProperty
} from '@lib/dto.lib';

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
