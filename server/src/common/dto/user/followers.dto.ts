import { Follow } from '@prisma/client';
import { UserDto } from './user.dto';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { ActivityTypes } from '../../enums/activity.enum';
import { IsDateString } from 'class-validator';
import { Exclude } from 'class-transformer';
import { IsEnumFlag } from '../../validators/is-enum-flag.validator';
import { NestedDto, NestedDtoOptional } from '@lib/dto.lib';

export class FollowDto implements Follow {
    @ApiPropertyOptional({
        enum: ActivityTypes,
        description:
            'The bitwise flags for the activities that the followee will be notified of when they are performed by the user they follow'
    })
    @IsEnumFlag(ActivityTypes)
    notifyOn: ActivityTypes;

    @Exclude()
    followedID: number;

    @Exclude()
    followeeID: number;

    @NestedDto(UserDto, { description: 'The user that is being followed' })
    followed: UserDto;

    @NestedDto(UserDto, { description: 'The user that is doing the following' })
    followee: UserDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class FollowStatusDto {
    @NestedDtoOptional(FollowDto, {
        description:
            'FollowerDto expressing the relationship between the LOCAL user and the target user, if the local user follows the target user'
    })
    local?: FollowDto;

    @NestedDtoOptional(FollowDto, {
        description:
            'FollowerDto expressing the relationship between the LOCAL user and the TARGET user, if the target user follows the local user'
    })
    target?: FollowDto;
}

export class UpdateFollowStatusDto extends PickType(FollowDto, ['notifyOn'] as const) {}
