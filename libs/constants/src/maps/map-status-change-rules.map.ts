import { MapStatus as S, Role as R } from '../';

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
 * | Disabled               | A        | A               | A                | A              | A              |          |
 *
 * (no, this data structure is not very performant but this doesn't get used
 * frequently and I don't want to bother with some crazy multi-key Map)
 */
//prettier-ignore
export const MapStatusChangeRules: ReadonlyArray<{from: S; to: S; roles: Array<R | 'submitter'>}> = [
  { from: S.APPROVED,         to: S.APPROVED,         roles: []},
  { from: S.APPROVED,         to: S.PRIVATE_TESTING,  roles: []},
  { from: S.APPROVED,         to: S.CONTENT_APPROVAL, roles: []},
  { from: S.APPROVED,         to: S.PUBLIC_TESTING,   roles: []},
  { from: S.APPROVED,         to: S.FINAL_APPROVAL,   roles: []},
  { from: S.APPROVED,         to: S.DISABLED,         roles: [R.ADMIN, R.MODERATOR]},

  { from: S.PRIVATE_TESTING,  to: S.APPROVED,         roles: []},
  { from: S.PRIVATE_TESTING,  to: S.PRIVATE_TESTING,  roles: []},
  { from: S.PRIVATE_TESTING,  to: S.CONTENT_APPROVAL, roles: ['submitter']},
  { from: S.PRIVATE_TESTING,  to: S.PUBLIC_TESTING,   roles: []},
  { from: S.PRIVATE_TESTING,  to: S.FINAL_APPROVAL,   roles: []},
  { from: S.PRIVATE_TESTING,  to: S.DISABLED,         roles: [R.ADMIN, R.MODERATOR]},

  { from: S.CONTENT_APPROVAL, to: S.APPROVED,         roles: []},
  { from: S.CONTENT_APPROVAL, to: S.PRIVATE_TESTING,  roles: ['submitter']},
  { from: S.CONTENT_APPROVAL, to: S.CONTENT_APPROVAL, roles: []},
  { from: S.CONTENT_APPROVAL, to: S.PUBLIC_TESTING,   roles: [R.REVIEWER, R.ADMIN, R.MODERATOR]},
  { from: S.CONTENT_APPROVAL, to: S.FINAL_APPROVAL,   roles: [R.ADMIN, R.MODERATOR]},
  { from: S.CONTENT_APPROVAL, to: S.DISABLED,         roles: [R.ADMIN, R.MODERATOR]},

  { from: S.PUBLIC_TESTING,   to: S.APPROVED,         roles: []},
  { from: S.PUBLIC_TESTING,   to: S.PRIVATE_TESTING,  roles: []},
  { from: S.PUBLIC_TESTING,   to: S.CONTENT_APPROVAL, roles: [R.ADMIN, R.MODERATOR]},
  { from: S.PUBLIC_TESTING,   to: S.PUBLIC_TESTING,   roles: []},
  { from: S.PUBLIC_TESTING,   to: S.FINAL_APPROVAL,   roles: ['submitter']},
  { from: S.PUBLIC_TESTING,   to: S.DISABLED,         roles: [R.ADMIN, R.MODERATOR]},

  { from: S.FINAL_APPROVAL,   to: S.APPROVED,         roles: [R.ADMIN, R.MODERATOR]},
  { from: S.FINAL_APPROVAL,   to: S.PRIVATE_TESTING , roles: []},
  { from: S.FINAL_APPROVAL,   to: S.CONTENT_APPROVAL, roles: []},
  { from: S.FINAL_APPROVAL,   to: S.PUBLIC_TESTING,   roles: ['submitter']},
  { from: S.FINAL_APPROVAL,   to: S.FINAL_APPROVAL,   roles: []},
  { from: S.FINAL_APPROVAL,   to: S.DISABLED,         roles: [R.ADMIN, R.MODERATOR]},

  { from: S.DISABLED,         to: S.APPROVED,         roles: [R.ADMIN]},
  { from: S.DISABLED,         to: S.PRIVATE_TESTING,  roles: [R.ADMIN]},
  { from: S.DISABLED,         to: S.CONTENT_APPROVAL, roles: [R.ADMIN]},
  { from: S.DISABLED,         to: S.PUBLIC_TESTING,   roles: [R.ADMIN]},
  { from: S.DISABLED,         to: S.FINAL_APPROVAL,   roles: [R.ADMIN]},
  { from: S.DISABLED,         to: S.DISABLED,         roles: []},
];
