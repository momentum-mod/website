import { Activity } from '@prisma/client';
import { ActivityTypes } from '../../enums/activity.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, ValidateNested, IsEnum, IsPositive } from 'class-validator';
import { UserDto } from './user.dto';
import { DtoFactory } from '@lib/dto.lib';
import { Transform } from 'class-transformer';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

export class ActivityDto implements PrismaModelToDto<Activity> {
    @IdProperty()
    id: number;

    @IdProperty({ description: 'The ID of the user the activity is associated with' })
    @IsPositive()
    userID: number;

    @NestedProperty(UserDto, { description: 'The ID of the user the activity is associated with' })
    user: UserDto;

    @ApiProperty({
        enum: ActivityTypes,
        description: 'The bitwise flags for the activities'
    })
    @IsEnum(ActivityTypes)
    type: ActivityTypes;

    // TODO: I kind of hate this approach, could we do individual DTOs for each using generics?
    @IdProperty({ bigint: true, description: 'ID of into the table of the relevant activity type e.g. Map, Run, User' })
    data: number;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}
