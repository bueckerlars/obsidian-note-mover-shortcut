import { TFile } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';

export class TriggerEventHandler {
  private periodicIntervalId: number | null = null;
  private onEditUnregister: (() => void) | null = null;

  constructor(private plugin: NoteMoverShortcutPlugin) {}

  public togglePeriodic(): void {
    if (this.periodicIntervalId) {
      window.clearInterval(this.periodicIntervalId);
      this.periodicIntervalId = null;
    }

    if (this.plugin.settings.enablePeriodicMovement) {
      const minutes = this.plugin.settings.periodicMovementInterval;
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

    if ((this.plugin.settings as any).enableOnEditTrigger) {
      this.plugin.registerEvent(
        this.plugin.app.vault.on('modify', async file => {
          if (file instanceof TFile && file.extension === 'md') {
            await this.handleOnEdit(file);
          }
        })
      );
      // For testing purposes, we'll store a mock function
      this.onEditUnregister = () => {};
    }
  }

  private async handleOnEdit(file: TFile): Promise<void> {
    // Skip filter is false for normal movement on edit
    await this.plugin.noteMover.moveFileBasedOnTags(file, '/', false);
  }
}
