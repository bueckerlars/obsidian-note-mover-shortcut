import type { TFile } from 'obsidian';
import type NoteMoverShortcutPlugin from 'main';

/**
 * Application use-case: move files using configured rules (delegates to core).
 */
export class MoveFileService {
  constructor(private readonly plugin: NoteMoverShortcutPlugin) {}

  async moveFocusedNoteToDestination(): Promise<void> {
    await this.plugin.noteMover.moveFocusedNoteToDestination();
  }

  async moveFileBasedOnTags(
    file: TFile,
    defaultFolder: string,
    skipFilter = false
  ): Promise<boolean> {
    return this.plugin.noteMover.moveFileBasedOnTags(
      file,
      defaultFolder,
      skipFilter
    );
  }

  async moveAllFilesInVault(opts?: { signal?: AbortSignal }): Promise<void> {
    await this.plugin.noteMover.moveAllFilesInVault(opts);
  }

  updateRuleManager(): void {
    this.plugin.noteMover.updateRuleManager();
  }
}
