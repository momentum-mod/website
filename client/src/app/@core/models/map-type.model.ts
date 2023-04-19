export enum MomentumMapType {
  UNKNOWN = 0,
  SURF,
  BHOP,
  KZ,
  RJ,
  SJ,
  TRICKSURF,
  AHOP,
  PARKOUR,
  CONC,
  DEFRAG
}

export function getTypeFromEnum(key: MomentumMapType): string {
  switch (key) {
    case MomentumMapType.SURF:
      return 'Surf';
    case MomentumMapType.BHOP:
      return 'Bunny Hop';
    case MomentumMapType.KZ:
      return 'Climb (KZ/XC)';
    case MomentumMapType.RJ:
      return 'Rocket Jump';
    case MomentumMapType.SJ:
      return 'Sticky Jump';
    case MomentumMapType.TRICKSURF:
      return 'Tricksurf';
    case MomentumMapType.AHOP:
      return 'Accelerated Hop';
    case MomentumMapType.PARKOUR:
      return 'Parkour';
    case MomentumMapType.CONC:
      return 'Conc';
    case MomentumMapType.DEFRAG:
      return 'Defrag';
    default:
      return MomentumMapType[key];
  }
}
