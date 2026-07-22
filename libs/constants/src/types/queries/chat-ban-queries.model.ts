import { PagedQuery } from './pagination.model';
import { ChatBan } from '../../';

export type ChatBanGetExpand = ('target' | 'issuer' | 'report')[];

export type ChatBanGetQuery = PagedQuery & {
  targetID?: number;
  // If omitted or false, only active (unexpired) bans are returned; if true,
  // expired bans are included as well.
  includeExpired?: boolean;
  expand?: ChatBanGetExpand;
};

export type CreateChatBan = Pick<
  ChatBan,
  'type' | 'expiresAt' | 'reason' | 'targetID'
>;

export type UpdateChatBan = Pick<ChatBan, 'expiresAt' | 'reason'>;
