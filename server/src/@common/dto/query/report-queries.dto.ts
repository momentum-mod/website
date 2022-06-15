﻿import { PaginationQuery } from './pagination.dto';
import { Transform, Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReportGetQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'resolved',
        description: 'Filter by resolved',
        type: Boolean
    })
    @IsOptional()
    @Type(() => Boolean)
    resolved: boolean; // Note: this was a string on old API.

    @ApiPropertyOptional({
        name: 'expand',
        description: 'Expand by submitter or resolver',
        type: String,
        example: 'submitter,resolver'
    })
    @IsOptional()
    @Transform(({ value }) => value.split(','))
    expand: string[];
}
