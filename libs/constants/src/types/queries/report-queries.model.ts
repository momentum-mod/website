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
    // Provide EITHER `data` (the reported object's ID, which the website already
    // knows) or `targetSteamID` (the SteamID of a reported player, which is all
    // the game knows — the backend resolves it to a user ID). `targetSteamID` is
    // only valid for PLAYER_REPORTs.
    targetSteamID?: string;
  };

export type UpdateReport = Pick<Report, 'resolved' | 'resolutionMessage'> & {
  // Chat/voice bans to issue against the reported user as part of resolving a
  // PLAYER_REPORT. Only honoured when the report is being resolved.
  bans?: CreateChatBan[];
};
