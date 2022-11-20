import { SkipQuery, TakeQuery } from '@lib/dto.lib';

export class PaginationQuery {
    @SkipQuery(0)
    skip = 0;

    @TakeQuery(20)
    take = 20;
}
