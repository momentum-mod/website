import { PaginationQuery } from './pagination.dto';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpandQueryDecorators } from '@lib/dto.lib';

export class ReportGetQuery extends PaginationQuery {
    @BooleanQueryProperty({ description: 'Filter by resolved' })
    resolved: boolean; // Note: this was a string on old API.

    @ExpandQueryProperty(['submitter', 'resolver'])
    expand: string[];
}
