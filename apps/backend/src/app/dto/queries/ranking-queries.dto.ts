import { RanksGetFilter, RanksGetQuery, Style } from '@momentum/constants';
import { EnumQueryProperty, FilterQueryProperty } from '../decorators';
import { PagedQueryDto } from './pagination.dto';

export class RanksGetQueryDto extends PagedQueryDto implements RanksGetQuery {
  @EnumQueryProperty(Style, {
    description: 'Style of the ladder. Defaults to NORMAL.'
  })
  readonly style: Style = Style.NORMAL;

  @FilterQueryProperty(['around'], {
    description:
      "Pass 'around' to return the page centered on the logged-in user. 'skip' is ignored when set."
  })
  readonly filter?: RanksGetFilter;
}
