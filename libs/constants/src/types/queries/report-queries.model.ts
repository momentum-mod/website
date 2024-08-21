import { PagedQuery } from './pagination.model';
import { Report } from '../../';

export type ReportGetExpand = ('submitter' | 'resolver')[];

export type ReportGetQuery = PagedQuery & {
  resolved?: boolean; // Note: this was a string on old API.
  expand?: ReportGetExpand;
};

export type CreateReport = Pick<
  Report,
  'data' | 'type' | 'category' | 'message'
>;

export type UpdateReport = Pick<Report, 'resolved' | 'resolutionMessage'>;
