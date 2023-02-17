import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQuery } from './pagination.dto';
import { ActivityTypes } from '../../enums/activity.enum';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

export class ActivitiesGetQuery extends PaginationQuery {
    @IntQueryProperty({ description: 'Filter by user ID' })
    userID: number;

    @EnumQueryProperty(ActivityTypes, { description: 'Types of activities to include' })
    type: ActivityTypes;

    @IntQueryProperty({ description: 'The ID into the table of the corresponding activity' })
    data: number;
}
