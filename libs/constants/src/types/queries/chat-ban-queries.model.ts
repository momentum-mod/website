import { ChatBan } from '../../';

// The chat/voice bans an admin issues when resolving a report. `targetID` (the
// reported user) and `reportID` are derived server-side from the report, so
// they aren't part of the input.
export type CreateChatBan = Pick<ChatBan, 'type'> &
  Partial<Pick<ChatBan, 'expiresAt' | 'reason'>>;

export type UpdateChatBan = Partial<Pick<ChatBan, 'expiresAt' | 'reason'>>;
