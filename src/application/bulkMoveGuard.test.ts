import { describe, expect, it, vi } from 'vitest';
import { runConfirmedBulkMove } from './bulkMoveGuard';

const undoHint = 'You can undo this from move history.';

describe('runConfirmedBulkMove', () => {
  it('does not rename files when confirmation is declined', async () => {
    const renameFile = vi.fn();

    await runConfirmedBulkMove({
      previewed: [{ path: 'Inbox/a.md' }, { path: 'Inbox/b.md' }],
      undoHint,
      confirm: async prompt => {
        expect(prompt.count).toBe(2);
        expect(prompt.paths).toEqual(['Inbox/a.md', 'Inbox/b.md']);
        expect(prompt.undoHint).toBe(undoHint);
        return false;
      },
      renameFile,
    });

    expect(renameFile).not.toHaveBeenCalled();
  });

  it('renames only the previewed files after confirmation', async () => {
    const previewed = [{ path: 'Inbox/a.md' }, { path: 'Inbox/b.md' }];
    const vault = [...previewed, { path: 'Keep/c.md' }];
    const renamed: string[] = [];

    await runConfirmedBulkMove({
      previewed,
      undoHint,
      confirm: async () => true,
      renameFile: async file => {
        renamed.push(file.path);
      },
    });

    expect(renamed).toEqual(['Inbox/a.md', 'Inbox/b.md']);
    expect(renamed).not.toContain('Keep/c.md');
    expect(
      vault.map(file => file.path).filter(path => !renamed.includes(path))
    ).toEqual(['Keep/c.md']);
  });

  it('shows the count and the first 10 paths', async () => {
    const previewed = Array.from({ length: 12 }, (_, index) => ({
      path: `Notes/n${index}.md`,
    }));
    const renamed: string[] = [];

    await runConfirmedBulkMove({
      previewed,
      undoHint,
      confirm: async prompt => {
        expect(prompt.count).toBe(12);
        expect(prompt.paths).toEqual(
          Array.from({ length: 10 }, (_, index) => `Notes/n${index}.md`)
        );
        expect(prompt.undoHint).toBe(undoHint);
        return true;
      },
      renameFile: async file => {
        renamed.push(file.path);
      },
    });

    expect(renamed).toHaveLength(12);
    expect(renamed).toEqual(previewed.map(file => file.path));
  });
});
