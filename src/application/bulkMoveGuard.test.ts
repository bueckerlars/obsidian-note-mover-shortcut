import { describe, expect, it, vi } from 'vitest';
import { runConfirmedBulkMove } from './bulkMoveGuard';

const file = (name: string, rule = 'Rule', destination = 'Archive') => ({
  path: `Inbox/${name}.md`,
  name,
  destination,
  rule,
});

describe('runConfirmedBulkMove', () => {
  it('does not rename files when confirmation is declined', async () => {
    const renameFile = vi.fn();

    await runConfirmedBulkMove({
      previewed: [file('a'), file('b')],
      confirm: async prompt => {
        expect(prompt.count).toBe(2);
        return false;
      },
      renameFile,
    });

    expect(renameFile).not.toHaveBeenCalled();
  });

  it('renames only the previewed files after confirmation', async () => {
    const previewed = [file('a'), file('b')];
    const renamed: string[] = [];

    await runConfirmedBulkMove({
      previewed,
      confirm: async () => true,
      renameFile: async item => {
        renamed.push(item.path);
      },
    });

    expect(renamed).toEqual(['Inbox/a.md', 'Inbox/b.md']);
  });

  it('lists the first 5 rows, the rest as a count, and counts rules', async () => {
    const previewed = Array.from({ length: 17 }, (_, index) =>
      file(`n${index}`, index % 2 ? 'Odd' : 'Even', `Dest/${index}`)
    );

    await runConfirmedBulkMove({
      previewed,
      confirm: async prompt => {
        expect(prompt.count).toBe(17);
        expect(prompt.ruleCount).toBe(2);
        expect(prompt.more).toBe(12);
        expect(prompt.rows).toEqual(
          Array.from({ length: 5 }, (_, index) => ({
            name: `n${index}`,
            destination: `Dest/${index}`,
          }))
        );
        return true;
      },
      renameFile: async () => {},
    });
  });
});
