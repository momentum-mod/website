import { PagedQuery } from './pagination.model';
import { Report } from '../../';
import { CreateChatBan } from './chat-ban-queries.model';

export type ReportGetExpand = ('submitter' | 'resolver')[];

export type ReportGetQuery = PagedQuery & {
  resolved?: boolean; // Note: this was a string on old API.
  expand?: ReportGetExpand;
};

export type CreateReport = Pick<Report, 'type' | 'category' | 'message'> &
  Partial<Pick<Report, 'data'>> & {
    targetSteamID?: string;
  };

export type UpdateReport = Pick<Report, 'resolved' | 'resolutionMessage'> & {
  chatBans?: CreateChatBan[];
};
