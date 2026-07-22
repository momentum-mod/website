import { PagedQuery } from './pagination.model';
import { Report } from '../../';
import { CreateChatBan } from './chat-ban-queries.model';

export type ReportGetExpand = ('submitter' | 'resolver')[];

export type ReportGetQuery = PagedQuery & {
  resolved?: boolean; // Note: this was a string on old API.
  expand?: ReportGetExpand;
};

export type CreateReport = Pick<
  Report,
  'data' | 'type' | 'category' | 'message'
>;

export type UpdateReport = Pick<Report, 'resolved' | 'resolutionMessage'> & {
  // Chat/voice bans to issue against the reported user as part of resolving a
  // PLAYER_REPORT. Only honoured when the report is being resolved.
  bans?: CreateChatBan[];
};
