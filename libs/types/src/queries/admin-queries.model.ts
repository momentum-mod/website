import { PagedQuery } from './pagination.model';

export type AdminCreateUserQuery = {
  alias?: string;
};

export type AdminGetReportsQuery = PagedQuery & {
  expand?: string[];
  resolved?: boolean;
};
