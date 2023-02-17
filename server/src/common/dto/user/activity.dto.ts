import { Activity } from '@prisma/client';
import { ActivityTypes } from '../../enums/activity.enum';
import { IsPositive } from 'class-validator';
import { UserDto } from './user.dto';
import {
    CreatedAtProperty,
    EnumProperty,
    IdProperty,
    NestedProperty,
    PrismaModelToDto,
    UpdatedAtProperty
} from '@lib/dto.lib';

export class ActivityDto implements PrismaModelToDto<Activity> {
    @IdProperty()
    id: number;

    @IdProperty({ description: 'The ID of the user the activity is associated with' })
    @IsPositive()
    userID: number;

    @NestedProperty(UserDto, { description: 'The ID of the user the activity is associated with' })
    user: UserDto;

    @EnumProperty(ActivityTypes)
    type: ActivityTypes;

    // TODO: I kind of hate this approach, could we do individual DTOs for each using generics?
    @IdProperty({ bigint: true, description: 'ID of into the table of the relevant activity type e.g. Map, Run, User' })
    data: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}
