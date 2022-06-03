import { Activity } from '@prisma/client';
import { EActivityTypes } from '../../enums/activity.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt } from 'class-validator';
import { UserDto } from './user.dto';

export class ActivityDto {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    user: UserDto;

    @ApiProperty()
    @IsEnum(EActivityTypes)
    type: EActivityTypes;

    @ApiProperty()
    data: bigint;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    constructor(_activity: Activity, _user: UserDto) {
        this.id = _activity.id;
        this.type = _activity.type;
        this.data = _activity.data;
        this.createdAt = _activity.createdAt;
        this.updatedAt = _activity.updatedAt;
        this.user = _user;
    }
}
