import { Role } from '../';

export const RoleNames: ReadonlyMap<Role, string> = new Map([
  [Role.ADMIN, 'Admin'],
  [Role.MODERATOR, 'Moderator'],
  [Role.MAPPER, 'Mapper'],
  [Role.PORTER, 'Porter'],
  [Role.DELETED, 'Deleted'],
  [Role.PLACEHOLDER, 'Placeholder'],
  [Role.REVIEWER, 'Reviewer'],
  [Role.VERIFIED, 'Verified']
]);
