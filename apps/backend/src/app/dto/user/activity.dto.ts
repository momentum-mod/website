import { Activity, DateString } from '@momentum/constants';
import { ActivityType } from '@momentum/constants';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../decorators';
import { UserDto } from './user.dto';

export class ActivityDto implements Activity {
  @IdProperty()
  readonly id: number;

  @IdProperty({
    description: 'The ID of the user the activity is associated with'
  })
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
  readonly createdAt: DateString;

  @UpdatedAtProperty()
  readonly updatedAt: DateString;
}
