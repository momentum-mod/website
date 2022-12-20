import { Activity } from '@prisma/client';
import { ActivityTypes } from '../../enums/activity.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, ValidateNested, IsEnum, IsPositive } from 'class-validator';
import { UserDto } from './user.dto';
import { DtoFactory } from '@lib/dto.lib';
import { Transform } from 'class-transformer';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

export class ActivityDto implements Activity {
    @ApiProperty({
        type: Number,
        description: 'The ID of the activity'
    })
    @IsPositive()
    id: number;

    @ApiProperty({
        type: Number,
        description: 'The ID of the user the activity is associated with'
    })
    @IsPositive()
    userID: number;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @ApiProperty({
        enum: ActivityTypes,
        description: 'The bitwise flags for the activities'
    })
    @IsEnum(ActivityTypes)
    type: ActivityTypes;

    @ApiProperty({
        type: Number,
        // TODO: I kind of hate this approach, could we do individual DTOs for each using generics?
        description: 'ID of into the table of the relevant activity type e.g. Map, Run, User'
    })
    @IsPositiveNumberString()
    data: bigint;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}
