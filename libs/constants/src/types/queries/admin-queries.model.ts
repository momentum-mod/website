import { PagedQuery } from './pagination.model';

export type AdminGetReportsExpand = ('submitter' | 'resolver')[];

export type AdminGetReportsQuery = PagedQuery & {
  expand?: AdminGetReportsExpand;
  resolved?: boolean;
};
