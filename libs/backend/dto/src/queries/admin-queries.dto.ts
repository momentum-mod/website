import { BooleanQueryProperty, StringQueryProperty } from '../decorators';
import { PaginationQueryDto } from './pagination.dto';
import { AdminCreateUserQuery, AdminGetReportsQuery } from '@momentum/types';

export class AdminCreateUserQueryDto implements AdminCreateUserQuery {
  @StringQueryProperty({
    required: true,
    description: 'The alias to set the new user to'
  })
  readonly alias: string;
}

export class AdminGetReportsQueryDto
  extends PaginationQueryDto
  implements AdminGetReportsQuery
{
  @BooleanQueryProperty({
    required: false,
    description: 'Specifies if you want resolved or not'
  })
  readonly resolved: boolean;
}
