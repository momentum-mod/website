import { PaginationQuery } from './pagination.model';

export interface ReportGetQuery extends PaginationQuery {
  resolved: boolean; // Note: this was a string on old API.
  expand: string[];
}
