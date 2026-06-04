import type { EventRef } from 'obsidian';
import { TFile } from 'obsidian';
import AdvancedNoteMoverPlugin from 'main';
import { DebounceManager } from '../utils/DebounceManager';
import { isMovableVaultFile } from '../domain/vault/movable-vault-files';

export class TriggerEventHandler {
  private periodicIntervalId: number | null = null;
  private onModifyEventRef: EventRef | null = null;
  private debounceManager: DebounceManager;
  private debouncedHandleOnEdit: (file: TFile) => void;

  constructor(private plugin: AdvancedNoteMoverPlugin) {
    this.debounceManager = new DebounceManager();
    // Initialize debounced handler after debounceManager is created
    this.debouncedHandleOnEdit = this.debounceManager.debounce(
      'onEdit',
      async (file: TFile) => {
        try {
          await this.handleOnEdit(file);
        } catch (error) {
          console.error('Error in debounced handleOnEdit:', error);
        }
      },
      2000 // 2 seconds delay - allows for rapid typing without excessive processing
    );
  }

  public togglePeriodic(): void {
    if (this.periodicIntervalId) {
      window.clearInterval(this.periodicIntervalId);
      this.periodicIntervalId = null;
    }

    if (this.plugin.settings.settings.triggers.enablePeriodicMovement) {
      const minutes =
        this.plugin.settings.settings.triggers.periodicMovementInterval;
      this.periodicIntervalId = window.setInterval(
        async () => {
          await this.plugin.advancedNoteMover.moveAllFilesInVaultPeriodic();
        },
        minutes * (60 * 1000)
      );
    }
  }

  public toggleOnEditListener(): void {
    if (this.onModifyEventRef) {
      this.plugin.app.vault.offref(this.onModifyEventRef);
      this.onModifyEventRef = null;
    }

    this.debounceManager.cancel('onEdit');

    if (this.plugin.settings.settings.triggers.enableOnEditTrigger) {
      this.onModifyEventRef = this.plugin.app.vault.on('modify', file => {
        if (file instanceof TFile && isMovableVaultFile(file)) {
          this.debouncedHandleOnEdit(file);
        }
      });
      this.plugin.registerEvent(this.onModifyEventRef);
    }
  }

  /**
   * Handles onEdit events for individual file modifications
   *
   * This method processes ONLY the specific file that was modified,
   * NOT the entire vault. This ensures optimal performance by avoiding
   * unnecessary processing of unrelated files.
   *
   * @param file - The specific TFile that was modified
   */
  private async handleOnEdit(file: TFile): Promise<void> {
    if (this.plugin.historyManager.isPluginMoveInProgress()) {
      return;
    }

    if (this.plugin.settings.settings.enableRuleEvaluationCache !== false) {
      // Ensure the file is marked dirty so the cache check re-evaluates it.
      // The vault event listener in main.ts does the same, but listener
      // ordering is not guaranteed.
      this.plugin.ruleCache.markDirty(file.path);
    }
    await this.plugin.advancedNoteMover.moveFileBasedOnTags(file, '/', false);
  }

  /**
   * Cleanup method to cancel all pending debounced operations
   * Should be called when the plugin is unloaded
   */
  public cleanup(): void {
    this.debounceManager.cancelAll();
  }
}
