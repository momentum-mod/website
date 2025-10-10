import { Role } from '../enums/role.enum';

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
]);
