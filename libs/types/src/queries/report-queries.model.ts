import { PagedQuery } from './pagination.model';

export interface ReportGetQuery extends PagedQuery {
  resolved: boolean; // Note: this was a string on old API.
  expand: string[];
}
