import { Activity } from '@prisma/client';
import { EActivityTypes } from '../../enums/activity.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt, IsOptional } from 'class-validator';
import { UserDto } from './user.dto';
import { DtoUtils } from '../../utils/dto-utils';
import { Transform } from 'class-transformer';

export class ActivityDto implements Activity {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
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
}
