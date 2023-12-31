import {
  AdminActivityType,
  AdminGetReportsExpand,
  AdminGetReportsQuery
} from '@momentum/constants';
import {
  BooleanQueryProperty,
  EnumFilterQueryProperty,
  ExpandQueryProperty
} from '../decorators';
import { PagedQueryDto } from './pagination.dto';

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

export class AdminGetAdminActivitiesQueryDto extends PagedQueryDto {
  @EnumFilterQueryProperty(
    [
      AdminActivityType.USER_UPDATE_ROLES,
      AdminActivityType.USER_UPDATE_BANS,
      AdminActivityType.USER_UPDATE_ALIAS,
      AdminActivityType.USER_UPDATE_BIO,
      AdminActivityType.USER_CREATE_PLACEHOLDER,
      AdminActivityType.USER_MERGE,
      AdminActivityType.USER_DELETE,
      AdminActivityType.MAP_UPDATE,
      AdminActivityType.MAP_DELETE,
      AdminActivityType.REPORT_UPDATE,
      AdminActivityType.REPORT_RESOLVE
    ],
    {
      description: 'Types of activities to include'
    }
  )
  readonly filter?: AdminActivityType[];
}
