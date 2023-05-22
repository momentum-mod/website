import { PagedQuery } from './pagination.model';

export interface AdminCreateUserQuery {
  alias?: string;
}

export interface AdminGetReportsQuery extends PagedQuery {
  expand?: string[];
  resolved?: boolean;
}
