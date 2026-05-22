import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import {
  collectSourceFoldersFromMoves,
  deleteEmptyAssetFoldersAfterMove,
  sortFoldersByDepthDesc,
} from './delete-empty-asset-folders';

describe('delete-empty-asset-folders', () => {
  describe('sortFoldersByDepthDesc', () => {
    it('orders deeper paths before shallower ones', () => {
      expect(
        sortFoldersByDepthDesc([
          'Folder A',
          'Folder A/_assets',
          'Folder A/_assets/thumbs',
        ])
      ).toEqual(['Folder A/_assets/thumbs', 'Folder A/_assets', 'Folder A']);
    });
  });

  describe('collectSourceFoldersFromMoves', () => {
    it('returns unique parent folders of moved attachments', () => {
      const folders = collectSourceFoldersFromMoves([
        {
          sourcePath: 'Folder A/_assets/a.png',
          destinationPath: 'Folder B/_assets/a.png',
        },
        {
          sourcePath: 'Folder A/_assets/b.png',
          destinationPath: 'Folder B/_assets/b.png',
        },
      ]);
      expect(folders).toEqual(['Folder A/_assets']);
    });
  });

  describe('deleteEmptyAssetFoldersAfterMove', () => {
    it('removes empty source asset folders', async () => {
      const rmdir = vi.fn().mockResolvedValue(undefined);
      const list = vi.fn().mockResolvedValue({ files: [], folders: [] });
      const exists = vi.fn().mockResolvedValue(true);

      const app = {
        vault: {
          adapter: { exists, list, rmdir },
        },
      } as unknown as App;

      const deleted = await deleteEmptyAssetFoldersAfterMove(app, [
        {
          sourcePath: 'Folder A/_assets/a.png',
          destinationPath: 'Folder B/_assets/a.png',
        },
      ]);

      expect(deleted).toEqual(['Folder A/_assets']);
      expect(rmdir).toHaveBeenCalledWith('Folder A/_assets', false);
    });

    it('skips folders that still contain files', async () => {
      const rmdir = vi.fn();
      const list = vi
        .fn()
        .mockResolvedValue({ files: ['other.png'], folders: [] });
      const exists = vi.fn().mockResolvedValue(true);

      const app = {
        vault: {
          adapter: { exists, list, rmdir },
        },
      } as unknown as App;

      const deleted = await deleteEmptyAssetFoldersAfterMove(app, [
        {
          sourcePath: 'Folder A/_assets/a.png',
          destinationPath: 'Folder B/_assets/a.png',
        },
      ]);

      expect(deleted).toEqual([]);
      expect(rmdir).not.toHaveBeenCalled();
    });
  });
});
