import { PagedQuery } from './pagination.model';
import { Style } from '../../enums/style.enum';

export type RanksGetFilter = 'around';

export type RanksGetQuery = PagedQuery & {
  /** Style of the ladder. Defaults to NORMAL. */
  style?: Style;
  /**
   * Pass 'around' to return the page of the ladder centered on the logged-in
   * user. `skip` is ignored when set.
   */
  filter?: RanksGetFilter;
};
