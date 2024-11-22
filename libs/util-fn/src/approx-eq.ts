/** Float equals check with threshold */
export function approxEq(A: number, B: number, threshold = 1e-6): boolean {
  return Math.abs(A - B) < threshold;
}
