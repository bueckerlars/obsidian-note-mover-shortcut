import type { TFile } from 'obsidian';
import type AdvancedNoteMoverPlugin from 'main';

/**
 * Application use-case: move files using configured rules (delegates to core).
 */
export class MoveFileService {
  constructor(private readonly plugin: AdvancedNoteMoverPlugin) {}

  async moveFocusedNoteToDestination(): Promise<void> {
    await this.plugin.advancedNoteMover.moveFocusedNoteToDestination();
  }

  async moveFileBasedOnTags(
    file: TFile,
    defaultFolder: string,
    skipFilter = false
  ): Promise<boolean> {
    return this.plugin.advancedNoteMover.moveFileBasedOnTags(
      file,
      defaultFolder,
      skipFilter
    );
  }

  async moveAllFilesInVault(opts?: { signal?: AbortSignal }): Promise<void> {
    await this.plugin.advancedNoteMover.moveAllFilesInVault(opts);
  }

  updateRuleManager(): void {
    this.plugin.advancedNoteMover.updateRuleManager();
  }
}
