import { MapStatus } from '../enums/map-status.enum';
import { Role } from '../enums/role.enum';

/**
 * Stores what changes between map statuses are allowed by what users
 *
 * In table form:
 *
 * | From(Down), To(Across) | Approved | Private Testing | Content Approval | Public Testing | Final Approval | Disabled |
 * | ---------------------- | -------- | --------------- | ---------------- | -------------- | -------------- | -------- |
 * | Approved               |          |                 |                  |                |                | AM       |
 * | Private Testing        |          |                 | S                |                |                | AM       |
 * | Content Approval       |          | S               |                  | RAM            | AM             | AM       |
 * | Public Testing         |          |                 | AM               |                | S              | AM       |
 * | Final Approval         | AM       |                 |                  | S              |                | AM       |
 * | Disabled               | A†       | A               | A                | A              | A              |          |
 *
 * † Admins can only move from disabled to approved if the map has been approved once in the past
 */
//prettier-ignore
export const MapStatusChangeRules: ReadonlyArray<{from: MapStatus; to: MapStatus; roles: Array<Role | 'submitter'>}> = [
  { from: MapStatus.APPROVED,         to: MapStatus.APPROVED,         roles: []},
  { from: MapStatus.APPROVED,         to: MapStatus.PRIVATE_TESTING,  roles: []},
  { from: MapStatus.APPROVED,         to: MapStatus.CONTENT_APPROVAL, roles: []},
  { from: MapStatus.APPROVED,         to: MapStatus.PUBLIC_TESTING,   roles: []},
  { from: MapStatus.APPROVED,         to: MapStatus.FINAL_APPROVAL,   roles: []},
  { from: MapStatus.APPROVED,         to: MapStatus.DISABLED,         roles: [Role.ADMIN, Role.MODERATOR]},

  { from: MapStatus.PRIVATE_TESTING,  to: MapStatus.APPROVED,         roles: []},
  { from: MapStatus.PRIVATE_TESTING,  to: MapStatus.PRIVATE_TESTING,  roles: []},
  { from: MapStatus.PRIVATE_TESTING,  to: MapStatus.CONTENT_APPROVAL, roles: ['submitter']},
  { from: MapStatus.PRIVATE_TESTING,  to: MapStatus.PUBLIC_TESTING,   roles: []},
  { from: MapStatus.PRIVATE_TESTING,  to: MapStatus.FINAL_APPROVAL,   roles: []},
  { from: MapStatus.PRIVATE_TESTING,  to: MapStatus.DISABLED,         roles: [Role.ADMIN, Role.MODERATOR]},

  { from: MapStatus.CONTENT_APPROVAL, to: MapStatus.APPROVED,         roles: []},
  { from: MapStatus.CONTENT_APPROVAL, to: MapStatus.PRIVATE_TESTING,  roles: ['submitter']},
  { from: MapStatus.CONTENT_APPROVAL, to: MapStatus.CONTENT_APPROVAL, roles: []},
  { from: MapStatus.CONTENT_APPROVAL, to: MapStatus.PUBLIC_TESTING,   roles: [Role.REVIEWER, Role.ADMIN, Role.MODERATOR]},
  { from: MapStatus.CONTENT_APPROVAL, to: MapStatus.FINAL_APPROVAL,   roles: [Role.ADMIN, Role.MODERATOR]},
  { from: MapStatus.CONTENT_APPROVAL, to: MapStatus.DISABLED,         roles: [Role.ADMIN, Role.MODERATOR]},

  { from: MapStatus.PUBLIC_TESTING,   to: MapStatus.APPROVED,         roles: []},
  { from: MapStatus.PUBLIC_TESTING,   to: MapStatus.PRIVATE_TESTING,  roles: []},
  { from: MapStatus.PUBLIC_TESTING,   to: MapStatus.CONTENT_APPROVAL, roles: [Role.ADMIN, Role.MODERATOR]},
  { from: MapStatus.PUBLIC_TESTING,   to: MapStatus.PUBLIC_TESTING,   roles: []},
  { from: MapStatus.PUBLIC_TESTING,   to: MapStatus.FINAL_APPROVAL,   roles: ['submitter', Role.ADMIN, Role.MODERATOR]},
  { from: MapStatus.PUBLIC_TESTING,   to: MapStatus.DISABLED,         roles: [Role.ADMIN, Role.MODERATOR]},

  { from: MapStatus.FINAL_APPROVAL,   to: MapStatus.APPROVED,         roles: [Role.ADMIN, Role.MODERATOR]},
  { from: MapStatus.FINAL_APPROVAL,   to: MapStatus.PRIVATE_TESTING , roles: []},
  { from: MapStatus.FINAL_APPROVAL,   to: MapStatus.CONTENT_APPROVAL, roles: []},
  { from: MapStatus.FINAL_APPROVAL,   to: MapStatus.PUBLIC_TESTING,   roles: ['submitter']},
  { from: MapStatus.FINAL_APPROVAL,   to: MapStatus.FINAL_APPROVAL,   roles: []},
  { from: MapStatus.FINAL_APPROVAL,   to: MapStatus.DISABLED,         roles: [Role.ADMIN, Role.MODERATOR]},

  { from: MapStatus.DISABLED,         to: MapStatus.APPROVED,         roles: [Role.ADMIN]},
  { from: MapStatus.DISABLED,         to: MapStatus.PRIVATE_TESTING,  roles: [Role.ADMIN]},
  { from: MapStatus.DISABLED,         to: MapStatus.CONTENT_APPROVAL, roles: [Role.ADMIN]},
  { from: MapStatus.DISABLED,         to: MapStatus.PUBLIC_TESTING,   roles: [Role.ADMIN]},
  { from: MapStatus.DISABLED,         to: MapStatus.FINAL_APPROVAL,   roles: [Role.ADMIN]},
  { from: MapStatus.DISABLED,         to: MapStatus.DISABLED,         roles: []},
];
