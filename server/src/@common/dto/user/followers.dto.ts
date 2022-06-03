import { Follow, User } from '@prisma/client';
import { UserDto } from './user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EActivityTypes } from '../../enums/activity.enum';
import { IsEnum } from 'class-validator';

export class FollowerDto {
    @ApiProperty()
    @IsEnum(EActivityTypes)
    notifyOn: EActivityTypes;

    @ApiProperty()
    followed: UserDto;

    @ApiProperty()
    followee: UserDto;

    constructor(_follow: Follow, _followee: User, _followed: User) {
        this.notifyOn = _follow.notifyOn;

        this.followed = new UserDto(_followed);
        this.followee = new UserDto(_followee);
    }
}
