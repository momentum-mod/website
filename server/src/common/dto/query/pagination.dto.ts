import { SkipQueryDecorators, TakeQueryDecorators } from '../../utils/dto.utility';

export class PaginationQuery {
    @SkipQueryDecorators(0)
    skip = 0;

    @TakeQueryDecorators(20)
    take = 20;
}
