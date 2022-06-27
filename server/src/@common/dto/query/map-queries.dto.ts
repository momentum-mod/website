import { PaginationQuery } from './pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MapStatus } from '../../enums/map.enum';

// Alex: This query is used by admin endpoint, might be a bit different for you -Tom
export class MapsGetAllQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'search',
        type: String,
        description: 'Filter by partial map name match',
        example: 'de_dust2'
    })
    @IsString()
    @IsOptional()
    search: string;

    @ApiPropertyOptional({
        name: 'submitterID',
        type: Number,
        description: 'Filter by submitter ID'
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    submitterID: number;

    @ApiPropertyOptional({
        name: 'expand',
        type: String,
        enum: ['info', 'submitter', 'credits'],
        description: 'Expand by info, submitter, and/or credits (comma-separated)',
        example: 'info,submitter,credits'
    })
    @IsOptional()
    @Transform(({ value }) => value.split(','))
    expand: string[];

    // I'm not completely sure this is right, enum handling might not be valid - Tom
    @ApiPropertyOptional({
        name: 'status',
        enum: MapStatus,
        type: Number,
        description: 'Filter by map status flags'
    })
    @IsOptional()
    @Type(() => Number)
    @IsEnum(MapStatus)
    status: MapStatus;

    @ApiPropertyOptional({
        name: 'priority',
        type: Boolean,
        description: 'Filter by priority or non-priority'
    })
    @IsOptional()
    @Type(() => Boolean) // TODO: Check this actually works!! Might run into some JS weirdness - Tom
    priority: boolean;
}
