import { FilterQueryProperty } from '../decorators';
import { PagedQueryDto } from './pagination.dto';

export class RankingGetQueryDto extends PagedQueryDto {
  @FilterQueryProperty(['around'], {
    description:
      'Filter mode. Pass "around" to return ranks centered on the logged-in user.'
  })
  readonly filter?: string[];
}
