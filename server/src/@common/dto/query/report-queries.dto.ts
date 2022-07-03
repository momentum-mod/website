import { PaginationQuery } from './pagination.dto';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpandQueryDecorators } from '../../utils/dto.utility';

export class ReportGetQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'resolved',
        description: 'Filter by resolved',
        type: Boolean
    })
    @IsOptional()
    @Type(() => Boolean)
    resolved: boolean; // Note: this was a string on old API.

    @ExpandQueryDecorators(['submitter', 'resolver'])
    expand: string[];
}
