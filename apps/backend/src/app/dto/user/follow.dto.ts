import {
  DateString,
  Flags,
  Follow,
  FollowStatus,
  UpdateFollowStatus
} from '@momentum/constants';
import { PickType } from '@nestjs/swagger';
import { ActivityType } from '@momentum/constants';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty
} from '../decorators';
import { UserDto } from './user.dto';

export class FollowDto implements Follow {
  @EnumProperty(ActivityType, {
    description:
      'The flags for the activities that the followee will be notified of when they are performed by the user they follow'
  })
  readonly notifyOn: Flags<ActivityType>;

  @IdProperty({ description: 'ID of the user being followed' })
  readonly followedID: number;

  @IdProperty({ description: 'ID of the user doing the following' })
  readonly followeeID: number;

  @NestedProperty(UserDto, { description: 'The user that is being followed' })
  readonly followed: UserDto;

  @NestedProperty(UserDto, {
    description: 'The user that is doing the following'
  })
  readonly followee: UserDto;

  @CreatedAtProperty()
  readonly createdAt: DateString;
}

export class FollowStatusDto implements FollowStatus {
  @NestedProperty(FollowDto, {
    required: false,
    description:
      'FollowerDto expressing the relationship between the LOCAL user and the target user, if the local user follows the target user'
  })
  local?: FollowDto;

  @NestedProperty(FollowDto, {
    required: false,
    description:
      'FollowerDto expressing the relationship between the LOCAL user and the TARGET user, if the target user follows the local user'
  })
  target?: FollowDto;
}

export class UpdateFollowStatusDto
  extends PickType(FollowDto, ['notifyOn'] as const)
  implements UpdateFollowStatus {}
