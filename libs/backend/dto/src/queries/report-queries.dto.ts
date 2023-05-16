import { BooleanQueryProperty, ExpandQueryProperty } from '../decorators';
import { PaginationQueryDto } from './pagination.dto';
import { ReportGetQuery } from '@momentum/types';

export class ReportGetQueryDto
  extends PaginationQueryDto
  implements ReportGetQuery
{
  @BooleanQueryProperty({ description: 'Filter by resolved' })
  readonly resolved: boolean; // Note: this was a string on old API.

  @ExpandQueryProperty(['submitter', 'resolver'])
  readonly expand: string[];
}
