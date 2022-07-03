import { Activity } from '@prisma/client';
import { ActivityTypes } from '../../enums/activity.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsDefined, IsInt, ValidateNested } from 'class-validator';
import { UserDto } from './user.dto';
import { DtoFactory } from '../../utils/dto.utility';
import { IsEnumFlag } from '../../validators/is-enum-flag.validator';
import { Transform } from 'class-transformer';

export class ActivityDto implements Activity {
    @ApiProperty({
        type: Number,
        description: 'The ID of the activity'
    })
    @IsDefined()
    @IsInt()
    id: number;

    @ApiProperty({
        type: Number,
        description: 'The ID of the user the activity is associated with'
    })
    @IsDefined()
    @IsInt()
    userID: number;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @ApiProperty({
        enum: ActivityTypes,
        description: 'The bitwise flags for the activities'
    })
    @IsDefined()
    @IsEnumFlag(ActivityTypes)
    type: ActivityTypes;

    @ApiProperty({
        type: Number,
        // TODO: I kind of hate this approach, could we do individual DTOs for each using generics?
        description: 'ID of into the table of the relevant activity type e.g. Map, Run, User'
    })
    @IsDefined()
    data: bigint;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}
