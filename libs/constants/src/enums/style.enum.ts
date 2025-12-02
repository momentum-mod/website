export enum Style {
  NORMAL = 0,
  BHOP_HALF_SIDEWAYS = 1,
  SURF_HALF_SIDEWAYS = 2,
  SIDEWAYS = 3,
  W_ONLY = 4,
  AD_ONLY = 5,
  S_ONLY = 6,
  BACKWARDS = 7,
  PRO = 8,
  TELEPORT = 9
}

const STYLE_NAMES: Record<Style, string> = {
  [Style.NORMAL]: 'Normal',
  [Style.BHOP_HALF_SIDEWAYS]: 'Half-Sideways',
  [Style.SURF_HALF_SIDEWAYS]: 'Half-Sideways',
  [Style.SIDEWAYS]: 'Sideways',
  [Style.W_ONLY]: 'W-Only',
  [Style.AD_ONLY]: 'A/D-Only',
  [Style.S_ONLY]: 'S-Only',
  [Style.BACKWARDS]: 'Backwards',
  [Style.PRO]: 'Pro',
  [Style.TELEPORT]: 'Teleport'
};

/** Get the English name of a style */
export function styleEnglishName(style: Style): string {
  return STYLE_NAMES[style] ?? 'Unknown';
}

export const COMPATIBLE_STYLES: Record<Style, Style[]> = {
  [Style.NORMAL]: [],
  [Style.BHOP_HALF_SIDEWAYS]: [Style.NORMAL],
  [Style.SURF_HALF_SIDEWAYS]: [Style.NORMAL],
  [Style.SIDEWAYS]: [Style.NORMAL],
  [Style.W_ONLY]: [Style.NORMAL],
  [Style.AD_ONLY]: [Style.NORMAL],
  [Style.S_ONLY]: [Style.NORMAL],
  [Style.BACKWARDS]: [Style.NORMAL],
  [Style.PRO]: [Style.TELEPORT],
  [Style.TELEPORT]: []
};
