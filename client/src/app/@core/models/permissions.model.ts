export enum Permission {
  MAPPER = 1 << 0,
  MODERATOR = 1 << 1,
  ADMIN = 1 << 2,
  BANNED_LEADERBOARDS = 1 << 3,
  BANNED_ALIAS = 1 << 4,
  BANNED_AVATAR = 1 << 5,
}
