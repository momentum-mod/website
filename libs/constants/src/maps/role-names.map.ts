import { Role } from '../enums/role.enum';
import { CompleteMap } from '../types/utils/compete-map.type';

export const RoleNames: ReadonlyMap<Role, string> = new Map([
  [Role.ADMIN, 'Admin'],
  [Role.MODERATOR, 'Moderator'],
  [Role.MAPPER, 'Mapper'],
  [Role.PORTER, 'Porter'],
  [Role.DELETED, 'Deleted'],
  [Role.PLACEHOLDER, 'Placeholder'],
  [Role.REVIEWER, 'Reviewer'],
  [Role.VERIFIED, 'Verified'],
  [Role.LIMITED, 'Limited']
]) satisfies CompleteMap<Role>;
