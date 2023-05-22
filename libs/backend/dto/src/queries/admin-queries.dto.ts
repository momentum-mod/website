import {
  BooleanQueryProperty,
  ExpandQueryProperty,
  StringQueryProperty
} from '../decorators';
import { PagedQueryDto } from './pagination.dto';
import { AdminCreateUserQuery, AdminGetReportsQuery } from '@momentum/types';
import { QueryDto } from './query.dto';

export class AdminCreateUserQueryDto
  extends QueryDto
  implements AdminCreateUserQuery
{
  @StringQueryProperty({
    required: true,
    description: 'The alias to set the new user to'
  })
  readonly alias?: string;
}

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
