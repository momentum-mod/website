export enum ERole {
    VERIFIED = 1 << 0,
    MAPPER = 1 << 1,
    MODERATOR = 1 << 2,
    ADMIN = 1 << 3,
    PLACEHOLDER = 1 << 4
}

export enum EBan {
    BANNED_LEADERBOARDS = 1 << 0,
    BANNED_ALIAS = 1 << 1,
    BANNED_AVATAR = 1 << 2,
    BANNED_BIO = 1 << 3
}
