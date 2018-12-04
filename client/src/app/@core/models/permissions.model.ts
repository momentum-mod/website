export enum Permission {
  VERIFIED = 1 << 0,
  MAPPER = 1 << 1,
  MODERATOR = 1 << 2,
  ADMIN = 1 << 3,
  BANNED_LEADERBOARDS = 1 << 4,
  BANNED_ALIAS = 1 << 5,
  BANNED_AVATAR = 1 << 6,
  BANNED_BIO = 1 << 7,
}
