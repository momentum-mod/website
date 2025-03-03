function colorValue(r: number, g: number, b: number) {
  return (r << 16) + (g << 8) + b;
}

export enum MomentumColor {
  Gray = colorValue(55, 55, 55),
  DarkGray = colorValue(42, 42, 42),
  DarkestGray = colorValue(32, 32, 32),

  LightGray = colorValue(65, 65, 65),
  LighterGray = colorValue(79, 79, 79),
  LightererGray = colorValue(95, 95, 95),
  LighterererGray = colorValue(130, 130, 130),
  LightestGray = colorValue(200, 200, 200),

  Red = colorValue(255, 106, 106),
  Green = colorValue(153, 255, 153),
  Blue = colorValue(24, 150, 211),
  GrayBlue = colorValue(76, 139, 180)
}
