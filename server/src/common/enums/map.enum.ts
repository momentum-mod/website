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

export const AllowedGameModes: MapType[] = [
  MapType.SURF,
  MapType.BHOP,
  MapType.RJ,
  MapType.SJ,
  MapType.AHOP,
  MapType.CONC,
  MapType.DEFRAG
];

export const getDefaultTickRateForMapType = (type: MapType): number => {
  switch (type) {
    case MapType.BHOP:
    case MapType.TRICKSURF:
    case MapType.CONC:
      return 0.01;
    case MapType.DEFRAG:
      return 0.008;
    case MapType.KZ:
      return 0.0078125;
    default:
      return 0.015;
  }
};

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

export enum MapZoneType {
  ZONE_END = 0,
  ZONE_START = 1,
  ZONE_STAGE = 2,
  ZONE_CHECKPOINT = 3
}
