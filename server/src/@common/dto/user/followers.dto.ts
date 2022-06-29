import { Follow } from '@prisma/client';
import { UserDto } from './user.dto';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { ActivityTypes } from '../../enums/activity.enum';
import { IsDateString, IsDefined, ValidateNested } from 'class-validator';
import { Exclude } from 'class-transformer';
import { IsEnumFlag } from '../../validators/is-enum-flag.validator';
import { DtoTransform } from '../../utils/dto-utils';

export class FollowDto implements Follow {
    @ApiPropertyOptional({
        enum: ActivityTypes,
        description:
            'The bitwise flags for the activities that the followee will be notified of when they are performed by the user they follow'
    })
    @IsDefined()
    @IsEnumFlag(ActivityTypes)
    notifyOn: ActivityTypes;

    @Exclude()
    followedID: number;

    @Exclude()
    followeeID: number;

    @ApiPropertyOptional({
        type: Number,
        description: 'The user that is being followed'
    })
    @IsDefined()
    @DtoTransform(UserDto)
    @ValidateNested()
    followed: UserDto;

    @ApiProperty({
        type: Number,
        description: 'The user that is doing the following'
    })
    @IsDefined()
    @DtoTransform(UserDto)
    @ValidateNested()
    followee: UserDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class FollowStatusDto {
    @ApiPropertyOptional({
        type: FollowDto,
        description:
            'FollowerDto expressing the relationship between the LOCAL user and the target user, if the local user follows the target user'
    })
    @DtoTransform(FollowDto)
    @ValidateNested()
    local?: FollowDto;

    @ApiPropertyOptional({
        type: FollowDto,
        description:
            'FollowerDto expressing the relationship between the LOCAL user and the TARGET user, if the target user follows the local user'
    })
    @DtoTransform(FollowDto)
    @ValidateNested()
    target?: FollowDto;
}

export class UpdateFollowStatusDto extends PickType(FollowDto, ['notifyOn'] as const) {}
