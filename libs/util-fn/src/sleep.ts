export function sleep(duration: number): Promise<void> {
  if (duration < 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, duration));
}
