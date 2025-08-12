export function withTimeout(
  testFn: (resolve: () => void) => void,
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const resolveWrapper = () => {
      clearTimeout(timer);
      resolve();
    };

    testFn(resolveWrapper);
  });
}
