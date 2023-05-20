import { PagedQuery } from './pagination.model';
import { Query } from './query.interface';

export interface AdminCreateUserQuery extends Query {
  alias: string;
}

export interface AdminGetReportsQuery extends PagedQuery {
  resolved: boolean;
}
