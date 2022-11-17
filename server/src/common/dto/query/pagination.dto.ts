import { SkipQueryDecorators, TakeQueryDecorators } from '@lib/dto.lib';

export class PaginationQuery {
    @SkipQueryDecorators(0)
    skip = 0;

    @TakeQueryDecorators(20)
    take = 20;
}
