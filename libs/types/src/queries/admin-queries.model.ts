import { PaginationQuery } from './pagination.model';

export interface AdminCreateUserQuery {
  alias: string;
}

export interface AdminGetReportsQuery extends PaginationQuery {
  resolved: boolean;
}
