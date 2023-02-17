import { PaginationQuery } from './pagination.dto';
import { BooleanQueryProperty, ExpandQueryProperty } from '@lib/dto.lib';

export class ReportGetQuery extends PaginationQuery {
    @BooleanQueryProperty({ description: 'Filter by resolved' })
    resolved: boolean; // Note: this was a string on old API.

    @ExpandQueryProperty(['submitter', 'resolver'])
    expand: string[];
}
