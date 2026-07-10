import { afterEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';

const { resolveMock, modalConstructionCount } = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  modalConstructionCount: { value: 0 },
}));

vi.mock('../modals/ConflictModal', () => ({
  ConflictModal: class {
    constructor() {
      modalConstructionCount.value++;
    }
    resolve = resolveMock;
  },
}));

import {
  clearConflictModalCoordinatorForTests,
  showConflictModalForNote,
} from './conflict-modal-coordinator';

const app = {} as App;

const modalOptions = (targetPath: string) => ({
  title: 'File already exists',
  fileName: 'note.md',
  sourcePath: 'inbox/note.md',
  targetPath,
});

describe('showConflictModalForNote', () => {
  afterEach(() => {
    clearConflictModalCoordinatorForTests();
    resolveMock.mockReset();
    modalConstructionCount.value = 0;
  });

  it('deduplicates concurrent requests for the same source and target', async () => {
    resolveMock.mockResolvedValue({ action: 'skip', applyAlways: false });

    const first = showConflictModalForNote(
      app,
      modalOptions('archive/note.md')
    );
    const second = showConflictModalForNote(
      app,
      modalOptions('archive/note.md')
    );

    await expect(Promise.all([first, second])).resolves.toEqual([
      { action: 'skip', applyAlways: false, shouldApplyResult: true },
      { action: 'skip', applyAlways: false, shouldApplyResult: false },
    ]);
    expect(modalConstructionCount.value).toBe(1);
  });

  it('opens separate modals for the same source with different targets', async () => {
    resolveMock.mockResolvedValue({ action: 'rename', applyAlways: false });

    const first = showConflictModalForNote(
      app,
      modalOptions('archive/note.md')
    );
    const second = showConflictModalForNote(
      app,
      modalOptions('projects/note.md')
    );

    await Promise.all([first, second]);

    expect(modalConstructionCount.value).toBe(2);
  });
});
