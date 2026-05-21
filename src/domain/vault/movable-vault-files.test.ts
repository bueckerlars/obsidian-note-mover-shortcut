import { describe, expect, it } from 'vitest';
import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import {
  getMovableVaultFiles,
  isMovableVaultFile,
  MOVABLE_VAULT_EXTENSIONS,
} from './movable-vault-files';

function mockFile(extension: string, path?: string): TFile {
  const file = new TFile();
  file.extension = extension;
  file.path = path ?? `folder/file.${extension}`;
  file.name = `file.${extension}`;
  return file;
}

describe('movable-vault-files', () => {
  it('exports the expected allowlist', () => {
    expect(MOVABLE_VAULT_EXTENSIONS).toEqual(['md', 'canvas', 'base']);
  });

  it.each([
    ['md', true],
    ['canvas', true],
    ['base', true],
    ['png', false],
    ['json', false],
    ['pdf', false],
  ])('isMovableVaultFile(%s) => %s', (ext, expected) => {
    expect(isMovableVaultFile(mockFile(ext))).toBe(expected);
  });

  it('getMovableVaultFiles filters vault files by allowlist', () => {
    const files = [
      mockFile('md', 'a.md'),
      mockFile('canvas', 'b.canvas'),
      mockFile('base', 'c.base'),
      mockFile('png', 'd.png'),
    ];
    const app = {
      vault: { getFiles: () => files },
    } as unknown as App;

    const movable = getMovableVaultFiles(app);
    expect(movable.map(f => f.path)).toEqual(['a.md', 'b.canvas', 'c.base']);
  });
});
