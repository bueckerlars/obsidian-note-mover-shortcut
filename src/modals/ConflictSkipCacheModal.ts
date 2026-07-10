import { App, Setting, TFile } from 'obsidian';
import AdvancedNoteMoverPlugin from 'main';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';
import { NoticeManager } from '../utils/NoticeManager';
import type { ConflictSkipCacheEntry } from '../types/ConflictSkipCache';
import { ConfirmModal } from './ConfirmModal';
import { handleError } from '../utils/Error';

export class ConflictSkipCacheModal extends BaseModal {
  constructor(
    app: App,
    private plugin: AdvancedNoteMoverPlugin,
    options: BaseModalOptions = {}
  ) {
    super(app, {
      title: 'Skipped move conflicts',
      titleIcon: '⚠️',
      cssClass: 'advancedNoteMover-conflict-skip-cache-modal',
      size: 'large',
      ...options,
    });
  }

  protected createContent(): void {
    const { contentEl } = this;
    const entries = this.plugin.conflictSkipCacheManager.getEntries();

    contentEl.createEl('p', {
      cls: 'advancedNoteMover-modal-subtitle',
      text: 'Notes that were skipped because a file already exists at the destination.',
    });

    if (entries.length === 0) {
      contentEl.createEl('div', {
        cls: 'advancedNoteMover-modal-empty',
        text: 'No skipped move conflicts.',
      });
      return;
    }

    const list = contentEl.createEl('div', {
      cls: 'advancedNoteMover-conflict-skip-cache-list',
    });

    for (const entry of entries) {
      this.createEntry(list, entry);
    }

    this.createFooterActions(contentEl);
  }

  private createEntry(container: HTMLElement, entry: ConflictSkipCacheEntry) {
    const isMobile = MobileUtils.isMobile();
    const fileName = entry.sourcePath.split('/').pop() ?? entry.sourcePath;

    const item = container.createEl('div', {
      cls: isMobile
        ? 'advancedNoteMover-modal-list-item advancedNoteMover-conflict-skip-cache-item advancedNoteMover-conflict-skip-cache-item-mobile'
        : 'advancedNoteMover-modal-list-item advancedNoteMover-conflict-skip-cache-item',
    });

    const mainInfo = item.createEl('div', {
      cls: 'advancedNoteMover-preview-item-main',
    });
    mainInfo.createEl('div', {
      cls: 'advancedNoteMover-preview-item-filename',
      text: fileName,
    });

    const pathInfo = item.createEl('div', {
      cls: isMobile
        ? 'advancedNoteMover-preview-item-paths advancedNoteMover-preview-item-paths-mobile'
        : 'advancedNoteMover-preview-item-paths',
    });

    if (isMobile) {
      pathInfo.createEl('div', {
        cls: 'advancedNoteMover-preview-path-mobile advancedNoteMover-preview-path-current',
        text: entry.sourcePath,
      });
      pathInfo.createEl('div', {
        cls: 'advancedNoteMover-preview-arrow-mobile',
        text: '↓',
      });
      pathInfo.createEl('div', {
        cls: 'advancedNoteMover-preview-path-mobile advancedNoteMover-preview-path-target',
        text: entry.targetPath,
      });
    } else {
      pathInfo.createSpan({
        cls: 'advancedNoteMover-current-path',
        text: entry.sourcePath,
      });
      pathInfo.createSpan({ cls: 'advancedNoteMover-arrow', text: ' → ' });
      pathInfo.createSpan({
        cls: 'advancedNoteMover-target-path',
        text: entry.targetPath,
      });
    }

    item.createEl('div', {
      cls: 'advancedNoteMover-conflict-skip-cache-skipped-at',
      text: `Skipped ${new Date(entry.skippedAt).toLocaleString()}`,
    });

    if (isMobile) {
      this.createMobileEntryActions(item, entry);
    } else {
      this.createDesktopEntryActions(item, entry);
    }
  }

  private createDesktopEntryActions(
    item: HTMLElement,
    entry: ConflictSkipCacheEntry
  ): void {
    new Setting(item)
      .addButton(btn =>
        btn
          .setButtonText('Open note')
          .setTooltip('Open the source note')
          .onClick(() => this.openSourceNote(entry))
      )
      .addButton(btn =>
        btn
          .setButtonText('Retry move')
          .setTooltip('Remove from cache and try moving again')
          .onClick(() => {
            void this.retryEntry(entry);
          })
      )
      .addButton(btn =>
        btn
          .setButtonText('Dismiss')
          .setTooltip('Remove from cache without moving')
          .onClick(() => {
            void this.dismissEntry(entry);
          })
      );
  }

  private createMobileEntryActions(
    item: HTMLElement,
    entry: ConflictSkipCacheEntry
  ): void {
    new Setting(item).addButton(btn =>
      btn.setButtonText('Open note').onClick(() => this.openSourceNote(entry))
    );
    new Setting(item).addButton(btn =>
      btn.setButtonText('Retry move').onClick(() => {
        void this.retryEntry(entry);
      })
    );
    new Setting(item).addButton(btn =>
      btn.setButtonText('Dismiss').onClick(() => {
        void this.dismissEntry(entry);
      })
    );
  }

  private createFooterActions(container: HTMLElement): void {
    const footer = container.createEl('div', {
      cls: 'advancedNoteMover-modal-footer',
    });
    const buttonContainer = this.createButtonContainer(footer);

    this.createButton(
      buttonContainer,
      'Remove stale entries',
      () => {
        void this.removeStaleEntries();
      },
      { tooltip: 'Remove entries whose source or target no longer exists' }
    );

    this.createButton(
      buttonContainer,
      'Clear all',
      () => {
        void this.clearAllEntries();
      },
      { isWarning: true, tooltip: 'Remove all skipped conflict entries' }
    );
  }

  private openSourceNote(entry: ConflictSkipCacheEntry): void {
    const file = this.app.vault.getAbstractFileByPath(entry.sourcePath);
    if (file instanceof TFile) {
      void this.app.workspace.getLeaf().openFile(file);
      this.close();
      return;
    }
    NoticeManager.error(`Could not find file at ${entry.sourcePath}`);
  }

  private async dismissEntry(entry: ConflictSkipCacheEntry): Promise<void> {
    await this.plugin.conflictSkipCacheManager.removeEntry(
      entry.sourcePath,
      entry.targetPath
    );
    this.refreshContent();
  }

  private async retryEntry(entry: ConflictSkipCacheEntry): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(entry.sourcePath);
    if (!(file instanceof TFile)) {
      NoticeManager.error(`Could not find file at ${entry.sourcePath}`);
      await this.plugin.conflictSkipCacheManager.removeEntry(
        entry.sourcePath,
        entry.targetPath
      );
      this.refreshContent();
      return;
    }

    await this.plugin.conflictSkipCacheManager.removeEntry(
      entry.sourcePath,
      entry.targetPath
    );
    this.close();

    try {
      await this.plugin.advancedNoteMover.moveFileBasedOnTags(
        file,
        '/',
        false,
        {
          bypassConflictSkipCache: true,
        }
      );
    } catch (error) {
      handleError(error, `Error retrying move for ${file.path}`, false);
    }
  }

  private async removeStaleEntries(): Promise<void> {
    const removed = await this.plugin.conflictSkipCacheManager.prune(this.app);
    if (removed === 0) {
      NoticeManager.info('No stale entries to remove.');
    } else {
      NoticeManager.success(
        `Removed ${removed} stale entr${removed === 1 ? 'y' : 'ies'}.`
      );
    }
    this.refreshContent();
  }

  private async clearAllEntries(): Promise<void> {
    const confirmed = await ConfirmModal.show(this.app, {
      title: 'Clear skipped conflicts',
      message:
        'Remove all skipped move conflict entries? Automatic triggers will try to move these notes again.',
      confirmText: 'Clear all',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await this.plugin.conflictSkipCacheManager.clearAll();
    NoticeManager.success('Cleared all skipped move conflicts.');
    this.refreshContent();
  }

  private refreshContent(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.createContent();
  }
}
