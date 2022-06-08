import { Follow } from '@prisma/client';
import { UserDto } from './user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EActivityTypes } from '../../enums/activity.enum';
import { IsDate, IsEnum, IsInt } from 'class-validator';
import { DtoUtils } from '../../utils/dto-utils';
import { Transform } from 'class-transformer';

export class FollowerDto implements Partial<Follow> {
    @ApiProperty()
    @IsEnum(EActivityTypes)
    notifyOn: EActivityTypes;

    @ApiProperty()
    @IsInt()
    followedID: number;

    @ApiProperty()
    @IsInt()
    followeeID: number;

    @ApiProperty()
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    followed: UserDto;

    @ApiProperty()
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
    @ApiProperty()
    @Transform(({ value }) => DtoUtils.Factory(FollowerDto, value))
    local?: FollowerDto;

    @ApiProperty()
    @Transform(({ value }) => DtoUtils.Factory(FollowerDto, value))
    target?: FollowerDto;
}
