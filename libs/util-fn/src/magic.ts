export function magic(str: string): number {
  if (str.length !== 4) {
    return -1;
  }

  return (
    (str.codePointAt(3) << 24) |
    (str.codePointAt(2) << 16) |
    (str.codePointAt(1) << 8) |
    (str.codePointAt(0) << 0)
  );
}
