import { TFile } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';
import { DebounceManager } from '../utils/DebounceManager';

export class TriggerEventHandler {
  private periodicIntervalId: number | null = null;
  private onEditUnregister: (() => void) | null = null;
  private debounceManager: DebounceManager;
  private debouncedHandleOnEdit: (file: TFile) => void;

  constructor(private plugin: NoteMoverShortcutPlugin) {
    this.debounceManager = new DebounceManager();
    // Initialize debounced handler after debounceManager is created
    this.debouncedHandleOnEdit = this.debounceManager.debounce(
      'onEdit',
      async (file: TFile) => {
        await this.handleOnEdit(file);
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
          await this.plugin.noteMover.moveAllFilesInVaultPeriodic();
        },
        minutes * (60 * 1000)
      );
    }
  }

  public toggleOnEditListener(): void {
    // Unregister existing listener
    if (this.onEditUnregister) {
      this.onEditUnregister();
      this.onEditUnregister = null;
    }

    // Cancel any pending debounced operations
    this.debounceManager.cancel('onEdit');

    if (this.plugin.settings.settings.triggers.enableOnEditTrigger) {
      this.plugin.registerEvent(
        this.plugin.app.vault.on('modify', async file => {
          if (file instanceof TFile && file.extension === 'md') {
            // Use debounced handler to prevent excessive processing
            this.debouncedHandleOnEdit(file);
          }
        })
      );
      // For testing purposes, we'll store a mock function
      this.onEditUnregister = () => {};
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
    // Process ONLY the specific modified file - no vault-wide operations
    // This is the key performance optimization: single-file processing
    await this.plugin.noteMover.moveFileBasedOnTags(file, '/', false);
  }

  /**
   * Cleanup method to cancel all pending debounced operations
   * Should be called when the plugin is unloaded
   */
  public cleanup(): void {
    this.debounceManager.cancelAll();
  }
}
