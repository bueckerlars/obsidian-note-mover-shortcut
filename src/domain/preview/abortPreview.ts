export async function readPreviewFiles<T>(
  files: readonly T[],
  read: (file: T) => Promise<void>,
  signal: AbortSignal,
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  const total = files.length;
  let completed = 0;
  for (const file of files) {
    if (signal.aborted) {
      return;
    }
    await read(file);
    if (signal.aborted) {
      return;
    }
    completed += 1;
    onProgress?.(completed, total);
  }
}
