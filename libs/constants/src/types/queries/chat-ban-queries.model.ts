import { ChatBan } from '../../';

export type CreateChatBan = Pick<ChatBan, 'type'> &
  Partial<Pick<ChatBan, 'expiresAt' | 'reason'>>;

export type UpdateChatBan = Partial<Pick<ChatBan, 'expiresAt' | 'reason'>>;
