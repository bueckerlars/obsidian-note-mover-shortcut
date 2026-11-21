import { describe, expect, it, vi } from 'vitest';
import { readPreviewFiles } from './abortPreview';

describe('readPreviewFiles', () => {
  it('does not read further files after abort', async () => {
    const controller = new AbortController();
    const read = vi.fn(async (file: number) => {
      if (file === 2) {
        controller.abort();
      }
    });

    await readPreviewFiles([1, 2, 3, 4], read, controller.signal);

    expect(read.mock.calls.map(call => call[0])).toEqual([1, 2]);
  });

  it('reads every file while the signal stays open', async () => {
    const read = vi.fn(async (file: string) => {
      void file;
    });

    await readPreviewFiles(['a', 'b', 'c'], read, new AbortController().signal);

    expect(read).toHaveBeenNthCalledWith(1, 'a');
    expect(read).toHaveBeenNthCalledWith(2, 'b');
    expect(read).toHaveBeenNthCalledWith(3, 'c');
  });

  it('reads nothing when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const read = vi.fn(async () => {});

    await readPreviewFiles([1, 2], read, controller.signal);

    expect(read).not.toHaveBeenCalled();
  });
});
