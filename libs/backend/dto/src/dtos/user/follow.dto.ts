import { Follow } from '@prisma/client';
import { UserDto } from './user.dto';
import { PickType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  CreatedAtProperty,
  EnumProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { ActivityType } from '@momentum/constants';

export class FollowDto implements Follow {
  @EnumProperty(ActivityType, {
    description:
      'The bitwise flags for the activities that the followee will be notified of when they are performed by the user they follow'
  })
  readonly notifyOn: ActivityType;

  @Exclude()
  readonly followedID: number;

  @Exclude()
  readonly followeeID: number;

  @NestedProperty(UserDto, { description: 'The user that is being followed' })
  readonly followed: UserDto;

  @NestedProperty(UserDto, {
    description: 'The user that is doing the following'
  })
  readonly followee: UserDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class FollowStatusDto {
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

export class UpdateFollowStatusDto extends PickType(FollowDto, [
  'notifyOn'
] as const) {}
