import { RanksGetFilter, RanksGetQuery, Style } from '@momentum/constants';
import { EnumQueryProperty, FilterQueryProperty } from '../decorators';
import { PagedQueryDto } from './pagination.dto';

// `filter` is a comma-separated string on the wire but an array after
// transformation, so the model's type is omitted here.
export class RanksGetQueryDto
  extends PagedQueryDto
  implements Omit<RanksGetQuery, 'filter'>
{
  @EnumQueryProperty(Style, {
    description: 'Style of the ladder. Defaults to NORMAL.'
  })
  readonly style: Style = Style.NORMAL;

  @FilterQueryProperty(['around'], {
    description:
      "Pass 'around' to return the page centered on the logged-in user. 'skip' is ignored when set."
  })
  readonly filter?: RanksGetFilter[];
}
