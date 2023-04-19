import { SkipQueryProperty, TakeQueryProperty } from '@lib/dto.lib';

export class PaginationQuery {
  @SkipQueryProperty(0)
  readonly skip = 0;

  @TakeQueryProperty(20)
  readonly take = 20;
}
