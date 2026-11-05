import { PagedQuery } from './pagination.model';
import { Style } from '../../enums/style.enum';

export type RanksGetFilter = 'around';

export type RanksGetQuery = PagedQuery & {
  style?: Style; // Default NORMAL
  filter?: RanksGetFilter;
};
