import { Activity } from '@prisma/client';
import { EActivityTypes } from '../../enums/activity.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt, IsOptional } from 'class-validator';
import { UserDto } from './user.dto';
import { DtoUtils } from '../../utils/dto-utils';
import { Transform } from 'class-transformer';

export class ActivityDto implements Activity {
    // TODO: Do we need to send this?
    @ApiProperty({
        type: Number,
        description: 'The ID of the activity'
    })
    @IsInt()
    id: number;

    @ApiProperty({
        type: Number,
        description: 'The ID of the user the activity is associated with'
    })
    @IsInt()
    userID: number;

    @ApiProperty({
        type: UserDto,
        description: 'The user the activity is associated with'
    })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    user: UserDto;

    @ApiProperty({
        enum: EActivityTypes,
        description: 'The bitwise flags for the activities'
    })
    @IsEnum(EActivityTypes)
    type: EActivityTypes;

    @ApiProperty({
        type: Number,
        // TODO: I kind of hate this approach, could we do individual DTOs for each using generics?
        description: 'ID of into the table of the relevant activity type e.g. Map, Run, User'
    })
    data: bigint;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;
}
