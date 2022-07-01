import { PaginationQuery } from './pagination.dto';
import { Transform, Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueryExpansion, QueryExpansionHandler } from '../../utils/dto-utils';

export class ReportGetQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'resolved',
        description: 'Filter by resolved',
        type: Boolean
    })
    @IsOptional()
    @Type(() => Boolean)
    resolved: boolean; // Note: this was a string on old API.

    @QueryExpansionHandler(['submitter', 'resolver'])
    expand: QueryExpansion;
}
