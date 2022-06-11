import { Follow } from '@prisma/client';
import { UserDto } from './user.dto';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { EActivityTypes } from '../../enums/activity.enum';
import { IsDate, IsEnum } from 'class-validator';
import { DtoUtils } from '../../utils/dto-utils';
import { Exclude, Transform } from 'class-transformer';

export class FollowerDto implements Partial<Follow> {
    @ApiPropertyOptional({
        enum: EActivityTypes,
        description:
            'The bitwise flags for the activities that the followee will be notified of when they are performed by the user they follow'
    })
    @IsEnum(EActivityTypes)
    notifyOn: EActivityTypes;

    @Exclude()
    followedID: number;

    @Exclude()
    followeeID: number;

    @ApiPropertyOptional({
        type: Number,
        description: 'The user that is being followed'
    })
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    followed: UserDto;

    @ApiProperty({
        type: Number,
        description: 'The user that is doing the following'
    })
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    followee: UserDto;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;
}

export class FollowStatusDto {
    @ApiPropertyOptional({
        type: FollowerDto,
        description:
            'FollowerDto expressing the relationship between the LOCAL user and the target user, if the local user follows the target user'
    })
    @Transform(({ value }) => DtoUtils.Factory(FollowerDto, value))
    local?: FollowerDto;

    @ApiPropertyOptional({
        type: FollowerDto,
        description:
            'FollowerDto expressing the relationship between the LOCAL user and the TARGET user, if the target user follows the local user'
    })
    @Transform(({ value }) => DtoUtils.Factory(FollowerDto, value))
    target?: FollowerDto;
}

export class UpdateFollowStatusDto extends PickType(FollowerDto, ['notifyOn'] as const) {}
