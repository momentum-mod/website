import { Activity } from '@prisma/client';
import { EActivityTypes } from '../../enums/activity.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsDefined, IsInt, IsOptional } from 'class-validator';
import { UserDto } from './user.dto';
import { DtoUtils } from '../../utils/dto-utils';
import { Transform } from 'class-transformer';
import { IsEnumFlag } from '../../validators/is-enum-flag';

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
    @IsDefined()
    @IsEnumFlag(EActivityTypes)
    type: EActivityTypes;

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
