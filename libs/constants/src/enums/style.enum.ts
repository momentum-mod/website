export enum Style {
  NORMAL = 0,
  HALF_SIDEWAYS,
  SIDEWAYS,
  W_ONLY,
  AD_ONLY,
  S_ONLY,
  BACKWARDS,
  NO_TELEPORT
}

const STYLE_NAMES: Record<Style, string> = {
  [Style.NORMAL]: 'Normal',
  [Style.HALF_SIDEWAYS]: 'Half-Sideways',
  [Style.SIDEWAYS]: 'Sideways',
  [Style.W_ONLY]: 'W-Only',
  [Style.AD_ONLY]: 'A/D-Only',
  [Style.S_ONLY]: 'S-Only',
  [Style.BACKWARDS]: 'Backwards',
  [Style.NO_TELEPORT]: 'No Teleport'
};

/** Get the English name of a style */
export function styleEnglishName(style: Style): string {
  return STYLE_NAMES[style] ?? 'Unknown';
}
