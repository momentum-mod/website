import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQuery } from './pagination.dto';
import { ActivityTypes } from '../../enums/activity.enum';

export class ActivitiesGetQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'userID',
        type: Number,
        description: 'Filter by user ID'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    userID: number;

    @ApiPropertyOptional({
        name: 'type',
        enum: ActivityTypes,
        type: Number,
        description: 'Types of activities to include'
    })
    @IsOptional()
    @IsEnum(ActivityTypes)
    @Type(() => Number)
    @IsInt()
    type: ActivityTypes;

    @ApiPropertyOptional({
        name: 'data',
        type: BigInt,
        description: 'The ID into the table of the corresponding activity'
    })
    @IsOptional()
    @Transform(({ value }) => BigInt(value))
    data: bigint;
}
