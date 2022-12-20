import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQuery } from './pagination.dto';
import { ActivityTypes } from '../../enums/activity.enum';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

export class ActivitiesGetQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'userID',
        type: Number,
        description: 'Filter by user ID'
    })
    @IsOptional()
    @IsPositive()
    userID: number;

    @ApiPropertyOptional({
        name: 'type',
        enum: ActivityTypes,
        type: Number,
        description: 'Types of activities to include'
    })
    @Type(() => Number)
    @IsEnum(ActivityTypes)
    @IsOptional()
    type: ActivityTypes;

    @ApiPropertyOptional({
        name: 'data',
        type: String,
        description: 'The ID into the table of the corresponding activity'
    })
    @Transform(({ value }) => BigInt(value))
    @IsPositiveNumberString()
    data: bigint;
}
