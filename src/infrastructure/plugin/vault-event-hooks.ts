import type { App, TAbstractFile } from 'obsidian';
import { TFile } from 'obsidian';
import type { Plugin } from 'obsidian';
import { isMovableVaultFile } from '../../domain/vault/movable-vault-files';

/** Subset of plugin API used by vault listeners (avoids circular import via `main`). */
export type PluginWithVaultSync = Plugin & {
  app: App;
  historyManager: {
    addEntryFromVaultEvent(
      oldPath: string,
      newPath: string,
      fileName: string
    ): void;
  };
  ruleCache: {
    handleRename(oldPath: string, newPath: string): void;
    markDirty(path: string): void;
    handleDelete(path: string): void;
  };
  vaultIndexCache?: {
    invalidateMovableFileList(): void;
    invalidateMarkdownList(): void;
    scheduleMetadataDerivedInvalidate(): void;
    attachMetadataInvalidationListeners(plugin: Plugin & { app: App }): void;
  };
};

export function registerVaultEventHooks(plugin: PluginWithVaultSync): void {
  plugin.registerEvent(
    plugin.app.vault.on('rename', (file, oldPath) => {
      if (file instanceof TFile && isMovableVaultFile(file)) {
        plugin.historyManager.addEntryFromVaultEvent(
          oldPath,
          file.path,
          file.name
        );
        plugin.ruleCache.handleRename(oldPath, file.path);
        plugin.vaultIndexCache?.invalidateMovableFileList();
        if (file.extension === 'md') {
          plugin.vaultIndexCache?.invalidateMarkdownList();
        }
      }
    })
  );

  plugin.registerEvent(
    plugin.app.vault.on('modify', (file: TAbstractFile) => {
      if (file instanceof TFile && isMovableVaultFile(file)) {
        plugin.ruleCache.markDirty(file.path);
        plugin.vaultIndexCache?.scheduleMetadataDerivedInvalidate();
      }
    })
  );

  plugin.registerEvent(
    plugin.app.vault.on('create', (file: TAbstractFile) => {
      if (file instanceof TFile && isMovableVaultFile(file)) {
        plugin.ruleCache.markDirty(file.path);
        plugin.vaultIndexCache?.invalidateMovableFileList();
        if (file.extension === 'md') {
          plugin.vaultIndexCache?.invalidateMarkdownList();
        }
      }
    })
  );

  plugin.registerEvent(
    plugin.app.vault.on('delete', (file: TAbstractFile) => {
      if (file instanceof TFile && isMovableVaultFile(file)) {
        plugin.ruleCache.handleDelete(file.path);
        plugin.vaultIndexCache?.invalidateMovableFileList();
        if (file.extension === 'md') {
          plugin.vaultIndexCache?.invalidateMarkdownList();
        }
      }
    })
  );
}

export function registerVaultIndexMetadataListeners(
  plugin: PluginWithVaultSync
): void {
  plugin.vaultIndexCache?.attachMetadataInvalidationListeners(plugin);
}
