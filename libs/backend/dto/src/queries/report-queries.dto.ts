import { BooleanQueryProperty, ExpandQueryProperty } from '../decorators';
import { PaginationQuery } from './pagination.dto';

export class ReportGetQuery extends PaginationQuery {
  @BooleanQueryProperty({ description: 'Filter by resolved' })
  readonly resolved: boolean; // Note: this was a string on old API.

  @ExpandQueryProperty(['submitter', 'resolver'])
  readonly expand: string[];
}
