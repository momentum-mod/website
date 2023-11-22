export function kebabCase(str) {
  return str
    .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
    .replaceAll(/\s+/g, '-')
    .toLowerCase();
}
