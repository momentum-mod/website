import { PagedQuery } from './pagination.model';

export type ReportGetQuery = PagedQuery & {
  resolved?: boolean; // Note: this was a string on old API.
  expand?: string[];
};
