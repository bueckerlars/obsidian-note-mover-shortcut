import type { App } from 'obsidian';
import { TFile } from 'obsidian';

/** Vault file extensions the plugin can move (notes, canvases, bases). */
export const MOVABLE_VAULT_EXTENSIONS = ['md', 'canvas', 'base'] as const;

export type MovableVaultExtension = (typeof MOVABLE_VAULT_EXTENSIONS)[number];

export function isMovableVaultFile(file: TFile): boolean {
  return (MOVABLE_VAULT_EXTENSIONS as readonly string[]).includes(
    file.extension
  );
}

export function getMovableVaultFiles(app: App): TFile[] {
  return app.vault.getFiles().filter(isMovableVaultFile);
}
