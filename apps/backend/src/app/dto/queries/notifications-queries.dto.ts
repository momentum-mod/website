import {
  BooleanQueryProperty,
  IntCsvQueryProperty,
  SkipQueryProperty,
  TakeQueryProperty
} from '../decorators';
import { QueryDto } from './query.dto';
import { ApiProperty } from '@nestjs/swagger';

export class NotifsMarkAsReadQueryDto extends QueryDto {
  @IntCsvQueryProperty({
    description: 'List of notification IDs to mark as read',
    required: false
  })
  notifIDs?: number[];

  @ApiProperty({
    description:
      'If true, notifIDs is ignored and all notifications are marked as read instead'
  })
  @BooleanQueryProperty({ required: false })
  all?: boolean;
}
export class NotifsGetQueryDto extends QueryDto {
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(25)
  take = 25;
}
