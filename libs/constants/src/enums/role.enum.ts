// prettier-ignore
export enum Role {
  ADMIN       = 0b00000001,
  MODERATOR   = 0b00000010,
  VERIFIED    = 0b00000100,
  PLACEHOLDER = 0b00001000,
  DELETED     = 0b00010000,
  REVIEWER    = 0b00100000,
  MAPPER      = 0b01000000,
  PORTER      = 0b10000000,
}

export const CombinedRoles = Object.freeze({
  MOD_OR_ADMIN: Role.MODERATOR | Role.ADMIN,
  REVIEWER_AND_ABOVE: Role.REVIEWER | Role.MODERATOR | Role.ADMIN,
  MAPPER_OR_PORTER: Role.MAPPER | Role.PORTER,
  MAPPER_AND_ABOVE:
    Role.MAPPER | Role.PORTER | Role.REVIEWER | Role.MODERATOR | Role.ADMIN
});
