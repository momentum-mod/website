import { Ban } from '../enums/ban.enum';
import { CompleteMap } from '../types/utils/compete-map.type';

export const BanNames: ReadonlyMap<Ban, string> = new Map([
  [Ban.LEADERBOARDS, 'Leaderboards'],
  [Ban.ALIAS, 'Alias'],
  [Ban.AVATAR, 'Avatar'],
  [Ban.BIO, 'Bio'],
  [Ban.MAP_SUBMISSION, 'Map submission']
]) satisfies CompleteMap<Ban>;
