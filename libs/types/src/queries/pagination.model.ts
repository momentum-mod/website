import { Query } from './query.interface';

export interface PaginationQuery extends Query {
  skip: number;
  take: number;
}
