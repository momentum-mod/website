import { SkipQueryProperty, TakeQueryProperty } from '../decorators';
import { QueryDto } from './query.dto';

export class NotifsGetQueryDto extends QueryDto {
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(25)
  take = 25;
}
