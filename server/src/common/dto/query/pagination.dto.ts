import { SkipQueryProperty, TakeQueryProperty } from '@lib/dto.lib';

export class PaginationQuery {
    @SkipQueryProperty(0)
    skip = 0;

    @TakeQueryProperty(20)
    take = 20;
}
