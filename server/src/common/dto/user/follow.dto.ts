import { Follow } from '@prisma/client';
import { UserDto } from './user.dto';
import { PickType } from '@nestjs/swagger';
import { ActivityType } from '../../enums/activity.enum';
import { Exclude } from 'class-transformer';
import { CreatedAtProperty, EnumProperty, NestedProperty, UpdatedAtProperty } from '@lib/dto.lib';

export class FollowDto implements Follow {
    @EnumProperty(ActivityType, {
        description:
            'The bitwise flags for the activities that the followee will be notified of when they are performed by the user they follow'
    })
    notifyOn: ActivityType;

    @Exclude()
    followedID: number;

    @Exclude()
    followeeID: number;

    @NestedProperty(UserDto, { description: 'The user that is being followed' })
    followed: UserDto;

    @NestedProperty(UserDto, { description: 'The user that is doing the following' })
    followee: UserDto;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
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

export class UpdateFollowStatusDto extends PickType(FollowDto, ['notifyOn'] as const) {}
