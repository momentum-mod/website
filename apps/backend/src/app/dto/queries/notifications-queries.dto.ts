import {
  BooleanQueryProperty,
  IntCsvQueryProperty,
  SkipQueryProperty,
  TakeQueryProperty
} from '../decorators';
import { QueryDto } from './query.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationsGetQuery,
  NotificationsDeleteQuery,
  NotificationsMarkReadQuery
} from '@momentum/constants';

export class NotificationsGetQueryDto
  extends QueryDto
  implements NotificationsGetQuery
{
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(25)
  take = 25;
}

export class NotificationsDeleteQueryDto
  extends QueryDto
  implements NotificationsDeleteQuery
{
  @IntCsvQueryProperty({
    description: 'List of notification IDs to delete',
    required: false
  })
  notificationIDs?: number[];

  @ApiProperty({
    description:
      'If true, notifIDs is ignored and all notifications are deleted instead'
  })
  @BooleanQueryProperty({ required: false })
  all?: boolean;
}

export class NotificationsMarkReadQueryDto
  extends QueryDto
  implements NotificationsMarkReadQuery
{
  @IntCsvQueryProperty({
    description: 'List of notification IDs to mark as read',
    required: false
  })
  notificationIDs?: number[];

  @ApiProperty({
    description:
      'If true, notifIDs is ignored and all notifications are marked as read instead'
  })
  @BooleanQueryProperty({ required: false })
  all?: boolean;
}
