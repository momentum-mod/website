export enum MapType {
    UNKNOWN = 0,
    SURF = 1,
    BHOP = 2,
    KZ = 3,
    RJ = 4,
    SJ = 5,
    TRICKSURF = 6,
    AHOP = 7,
    PARKOUR = 8,
    CONC = 9,
    DEFRAG = 10
}

export enum MapStatus {
    APPROVED = 0,
    PENDING = 1,
    NEEDS_REVISION = 2,
    PRIVATE_TESTING = 3,
    PUBLIC_TESTING = 4,
    READY_FOR_RELEASE = 5,
    REJECTED = 6,
    REMOVED = 7
}

export enum MapCreditType {
    AUTHOR = 0,
    COAUTHOR = 1,
    TESTER = 2,
    SPECIAL_THANKS = 3
}

// TODO: Finish enum
export enum MapTriggerType {
    UNKNOWN = 0
}
