import { BooleanQueryProperty, ExpandQueryProperty } from '../decorators';
import { PagedQueryDto } from './pagination.dto';
import { ReportGetExpand, ReportGetQuery } from '@momentum/constants';

export class ReportGetQueryDto extends PagedQueryDto implements ReportGetQuery {
  @BooleanQueryProperty({ description: 'Filter by resolved' })
  readonly resolved?: boolean; // Note: this was a string on old API.

  @ExpandQueryProperty(['submitter', 'resolver'])
  readonly expand?: ReportGetExpand;
}
