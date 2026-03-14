import { PagedQuery } from './pagination.model';

export type RankingGetQuery = PagedQuery & {
  filter?: 'around';
};
