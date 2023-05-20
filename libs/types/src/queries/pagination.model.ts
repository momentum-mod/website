import { Query } from './query.interface';

export interface PagedQuery extends Query {
  skip: number;
  take: number;
}
