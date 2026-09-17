import { ChatBanType } from '../enums/chat-ban.enum';
import { CompleteMap } from '../types/utils/compete-map.type';

export const ChatBanTypeNames: ReadonlyMap<ChatBanType, string> = new Map([
  [ChatBanType.CHAT, 'Text Chat'],
  [ChatBanType.VOICE, 'Voice Chat']
]) satisfies CompleteMap<ChatBanType>;
