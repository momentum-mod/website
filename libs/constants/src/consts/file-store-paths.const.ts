export function approvedBspPath(key: string | number): string {
  return `maps/${key}.bsp`;
}

export function approvedVmfsPath(key: string | number): string {
  return `maps/${key}_VMFs.zip`;
}

export function submissionBspPath(key: string | number): string {
  return `submissions/${key}.bsp`;
}

export function submissionVmfsPath(key: string | number): string {
  return `submissions/${key}_VMFs.zip`;
}

export function imgSmallPath(key: string): string {
  return `img/${key}-small.jpg`;
}

export function imgMediumPath(key: string): string {
  return `img/${key}-medium.jpg`;
}

export function imgLargePath(key: string): string {
  return `img/${key}-large.jpg`;
}

export function imgXlPath(key: string): string {
  return `img/${key}-xl.jpg`;
}

export function runPath(key: string | number | bigint): string {
  return `runs/${key}`;
}

export function mapReviewAssetPath(key: string): string {
  return `mapreview/${key}`;
}
