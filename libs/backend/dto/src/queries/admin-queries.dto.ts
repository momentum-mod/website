import {
  BooleanQueryProperty,
  ExpandQueryProperty,
  StringQueryProperty
} from '../decorators';
import { PagedQueryDto } from './pagination.dto';
import {
  AdminCreateUserQuery,
  AdminGetReportsQuery
} from '@momentum/constants';

export class AdminGetReportsQueryDto
  extends PagedQueryDto
  implements AdminGetReportsQuery
{
  @ExpandQueryProperty(['submitter', 'resolver'])
  readonly expand: string[];

  @BooleanQueryProperty({
    required: false,
    description: 'Specifies if you want resolved or not'
  })
  readonly resolved?: boolean;
}
