import { Follow, User } from '@prisma/client';
import { UserDto } from './user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EActivityTypes } from '../../enums/activity.enum';
import { IsDate, IsEnum } from 'class-validator';

export class FollowerDto implements Partial<Follow> {
    @ApiProperty()
    @IsEnum(EActivityTypes)
    notifyOn: EActivityTypes;

    @ApiProperty()
    followed: UserDto;

    @ApiProperty()
    followee: UserDto;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    constructor(_follow: Follow, _followee: UserDto, _followed: UserDto) {
        this.notifyOn = _follow.notifyOn;

        this.followed = _followed;
        this.followee = _followee;
    }
}
