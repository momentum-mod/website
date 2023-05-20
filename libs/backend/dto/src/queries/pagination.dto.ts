import { PagedQuery } from '@momentum/types';
import { SkipQueryProperty, TakeQueryProperty } from '../decorators';
import { QueryDto } from './query.dto';

export class PagedQueryDto extends QueryDto implements PagedQuery {
  @SkipQueryProperty(0)
  readonly skip: number = 0;

  @TakeQueryProperty(20)
  readonly take: number = 20;
}
