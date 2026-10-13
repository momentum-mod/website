import { ChatBan } from '../../';

export type CreateChatBan = Pick<ChatBan, 'type'> &
  Partial<Pick<ChatBan, 'expiresAt' | 'reason'>>;

export type AdminCreateChatBan = CreateChatBan & Pick<ChatBan, 'targetID'>;

export type UpdateChatBan = Partial<Pick<ChatBan, 'expiresAt' | 'reason'>>;
