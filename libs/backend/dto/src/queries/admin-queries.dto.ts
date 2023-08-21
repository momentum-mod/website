import { BooleanQueryProperty, ExpandQueryProperty } from '../decorators';
import { PagedQueryDto } from './pagination.dto';
import {
  AdminGetReportsExpand,
  AdminGetReportsQuery
} from '@momentum/constants';

export class AdminGetReportsQueryDto
  extends PagedQueryDto
  implements AdminGetReportsQuery
{
  @ExpandQueryProperty(['submitter', 'resolver'])
  readonly expand: AdminGetReportsExpand;

  @BooleanQueryProperty({
    required: false,
    description: 'Specifies if you want resolved or not'
  })
  readonly resolved?: boolean;
}
