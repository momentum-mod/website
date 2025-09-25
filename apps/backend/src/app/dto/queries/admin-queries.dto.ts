import {
  AdminGetAdminActivitiesQuery,
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

export class AdminGetAdminActivitiesQueryDto
  extends PagedQueryDto
  implements AdminGetAdminActivitiesQuery
{
  @EnumFilterQueryProperty(
    [
      AdminActivityType.USER_UPDATE,
      AdminActivityType.USER_CREATE_PLACEHOLDER,
      AdminActivityType.USER_MERGE,
      AdminActivityType.USER_DELETE,
      AdminActivityType.MAP_UPDATE,
      AdminActivityType.MAP_CONTENT_DELETE,
      AdminActivityType.REPORT_UPDATE,
      AdminActivityType.REPORT_RESOLVE,
      AdminActivityType.REVIEW_DELETED,
      AdminActivityType.REVIEW_COMMENT_DELETED
    ],
    {
      description: 'Types of activities to include'
    }
  )
  readonly filter?: AdminActivityType[];
}
