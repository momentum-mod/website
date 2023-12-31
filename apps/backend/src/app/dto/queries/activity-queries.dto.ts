import { ActivityType } from '@momentum/constants';
import { ActivitiesGetQuery } from '@momentum/constants';
import { EnumQueryProperty, IntQueryProperty } from '../decorators';
import { PagedQueryDto } from './pagination.dto';

export class ActivitiesGetQueryDto
  extends PagedQueryDto
  implements ActivitiesGetQuery
{
  @IntQueryProperty({ description: 'Filter by user ID' })
  readonly userID?: number;

  @EnumQueryProperty(ActivityType, {
    description: 'Types of activities to include'
  })
  readonly type?: ActivityType;

  @IntQueryProperty({
    description: 'The ID into the table of the corresponding activity'
  })
  readonly data?: number;
}
