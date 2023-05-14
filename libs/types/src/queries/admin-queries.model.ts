import { PaginationQuery } from './pagination.model';
import { Query } from './query.interface';

export interface AdminCreateUserQuery extends Query {
  alias: string;
}

export interface AdminGetReportsQuery extends PaginationQuery {
  resolved: boolean;
}
