export function kebabCase(str: string): string {
  return str
    .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
    .replaceAll(/\s+/g, '-')
    .toLowerCase();
}
