import { Setting, App, TFile } from 'obsidian';
import { MovePreview, PreviewEntry } from '../types/MovePreview';
import AdvancedNoteMoverPlugin from 'main';
import { NoticeManager } from '../utils/NoticeManager';
import { MobileUtils } from '../utils/MobileUtils';
import { combinePath, ensureFolderExists } from '../utils/PathUtils';
import { handleError, createError } from '../utils/Error';
import { performNoteMove } from '../application/perform-note-move';
import { getAttachmentMoveSettings } from '../utils/attachment-settings';
import { BaseModal, BaseModalOptions } from './BaseModal';

export class PreviewModal extends BaseModal {
  private movePreview: MovePreview;
  private actionFooterEl: HTMLElement | null = null;

  constructor(
    app: App,
    private plugin: AdvancedNoteMoverPlugin,
    movePreview: MovePreview,
    options: BaseModalOptions = {}
  ) {
    super(app, {
      title: 'Move Preview',
      titleIcon: '🔍',
      cssClass: 'note-mover-preview-modal',
      size: 'large',
      ...options,
    });
    this.movePreview = movePreview;
  }

  protected createContent(): void {
    const { contentEl } = this;

    // Subtitle with statistics
    const stats = this.movePreview;
    const subtitle = `${stats.totalFiles} files analyzed • ${stats.successfulMoves.length} will be moved`;
    contentEl.createEl('p', {
      text: subtitle,
      cls: 'advancedNoteMover-modal-subtitle',
    });

    // Settings info removed - Rules and Filter are always enabled now

    // Successful moves section
    if (stats.successfulMoves.length > 0) {
      this.createSuccessfulMovesSection(contentEl, stats.successfulMoves);
    }

    // Blocked moves section removed - only files that will be moved are shown

    // No files message
    if (stats.totalFiles === 0) {
      contentEl.createEl('div', {
        cls: 'advancedNoteMover-modal-empty',
        text: 'No files found to analyze.',
      });
    }

    // Action buttons
    this.createActionButtons(contentEl);
  }

  private createSuccessfulMovesSection(
    container: HTMLElement,
    entries: PreviewEntry[]
  ) {
    const isMobile = MobileUtils.isMobile();
    const section = this.createSection(
      container,
      isMobile
        ? 'advancedNoteMover-preview-section advancedNoteMover-preview-section-success advancedNoteMover-preview-section-mobile'
        : 'advancedNoteMover-preview-section advancedNoteMover-preview-section-success'
    );

    const header = section.createEl('div', {
      cls: 'advancedNoteMover-modal-section-header',
    });
    header.createEl('h3', {
      text: `✅ Files to be moved (${entries.length})`,
    });

    const list = section.createEl('div', {
      cls: isMobile
        ? 'advancedNoteMover-modal-list advancedNoteMover-modal-list-mobile'
        : 'advancedNoteMover-modal-list',
    });

    entries.forEach(entry => {
      const item = list.createEl('div', {
        cls: isMobile
          ? 'advancedNoteMover-modal-list-item advancedNoteMover-preview-item-success advancedNoteMover-preview-item-mobile'
          : 'advancedNoteMover-modal-list-item advancedNoteMover-preview-item-success',
      });

      const mainInfo = item.createEl('div', {
        cls: 'advancedNoteMover-preview-item-main',
      });
      const fileName = mainInfo.createEl('div', {
        cls: 'advancedNoteMover-preview-item-filename',
      });
      fileName.textContent = entry.fileName;

      const pathInfo = mainInfo.createEl('div', {
        cls: isMobile
          ? 'advancedNoteMover-preview-item-paths advancedNoteMover-preview-item-paths-mobile'
          : 'advancedNoteMover-preview-item-paths',
      });

      if (isMobile) {
        // Mobile: Stack paths vertically
        const currentPathEl = pathInfo.createEl('div', {
          cls: 'advancedNoteMover-preview-path-mobile advancedNoteMover-preview-path-current',
        });
        currentPathEl.textContent = entry.currentPath;

        const arrowEl = pathInfo.createEl('div', {
          cls: 'advancedNoteMover-preview-arrow-mobile',
        });
        arrowEl.textContent = '↓';

        const targetPathEl = pathInfo.createEl('div', {
          cls: 'advancedNoteMover-preview-path-mobile advancedNoteMover-preview-path-target',
        });
        targetPathEl.textContent = entry.targetPath;
      } else {
        // Desktop: Horizontal layout
        pathInfo.createSpan({
          cls: 'advancedNoteMover-current-path',
          text: entry.currentPath,
        });
        pathInfo.createSpan({
          cls: 'advancedNoteMover-arrow',
          text: ' → ',
        });
        pathInfo.createSpan({
          cls: 'advancedNoteMover-target-path',
          text: entry.targetPath ?? '',
        });
      }

      const details = item.createEl('div', {
        cls: isMobile
          ? 'advancedNoteMover-preview-item-details advancedNoteMover-preview-item-details-mobile'
          : 'advancedNoteMover-preview-item-details',
      });

      if (entry.matchedRule) {
        const rule = details.createEl('div', {
          cls: 'advancedNoteMover-preview-item-rule',
        });
        rule.createSpan({
          cls: 'advancedNoteMover-rule-label',
          text: 'Rule:',
        });
        rule.createEl('code', { text: entry.matchedRule ?? '' });
      }

      if (entry.tags && entry.tags.length > 0) {
        const tags = details.createEl('div', {
          cls: 'advancedNoteMover-preview-item-tags',
        });
        tags.createSpan({
          cls: 'advancedNoteMover-tags-label',
          text: 'Tags:',
        });
        for (const tag of entry.tags) {
          tags.createSpan({ cls: 'advancedNoteMover-tag', text: ` ${tag}` });
        }
      }
    });
  }

  // createBlockedMovesSection removed - only files that will be moved are shown

  private createActionButtons(container: HTMLElement) {
    const isMobile = MobileUtils.isMobile();
    const footer = container.createEl('div', {
      cls: isMobile
        ? 'advancedNoteMover-modal-footer advancedNoteMover-modal-footer-mobile'
        : 'advancedNoteMover-modal-footer',
    });
    this.actionFooterEl = footer;

    const buttonContainer = this.createButtonContainer(footer);

    if (this.movePreview.successfulMoves.length > 0) {
      this.createButton(
        buttonContainer,
        `Move ${this.movePreview.successfulMoves.length} files`,
        () => {
          void this.executeMoves();
        },
        { isPrimary: true }
      );
    }

    this.createButton(buttonContainer, 'Cancel', () => {
      this.close();
    });
  }

  private async executeMoves() {
    const successfulEntries = this.movePreview.successfulMoves;
    let movedCount = 0;
    let errorCount = 0;
    const abortCtl = new AbortController();

    if (this.actionFooterEl) {
      this.actionFooterEl.empty();
      const status = this.actionFooterEl.createDiv({
        cls: 'advancedNoteMover-preview-bulk-status',
        text: `Moving files… (${successfulEntries.length} planned)`,
      });
      const row = this.actionFooterEl.createDiv({
        cls: 'advancedNoteMover-preview-bulk-actions',
      });
      new Setting(row).addButton(btn =>
        btn.setButtonText('Stop').onClick(() => {
          abortCtl.abort();
          status.setText('Stopping after current file…');
        })
      );
    }

    this.plugin.historyManager.startBulkOperation('bulk');

    try {
      for (let i = 0; i < successfulEntries.length; i++) {
        const entry = successfulEntries[i];
        if (abortCtl.signal.aborted) {
          break;
        }
        try {
          const file = this.app.vault.getAbstractFileByPath(entry.currentPath);
          if (!(file instanceof TFile) || !entry.targetPath) continue;

          const targetFolder = entry.targetPath;
          const newPath = combinePath(targetFolder, file.name);
          if (file.path === newPath) continue;

          if (!(await ensureFolderExists(this.app, targetFolder))) {
            throw createError(
              `Failed to create target folder: ${targetFolder}`
            );
          }

          await performNoteMove({
            app: this.app,
            historyManager: this.plugin.historyManager,
            file,
            originalPath: entry.currentPath,
            newPath,
            attachmentSettings: getAttachmentMoveSettings(
              this.plugin.settings.settings
            ),
          });
          movedCount++;
        } catch (error) {
          handleError(error, `Error moving file ${entry.fileName}`, false);
          errorCount++;
        }
        if ((i + 1) % 50 === 0 && i + 1 < successfulEntries.length) {
          await new Promise<void>(resolve => {
            const ric = window.requestIdleCallback;
            if (typeof ric === 'function') {
              ric(() => resolve(), { timeout: 250 });
            } else {
              window.setTimeout(resolve, 0);
            }
          });
        }
      }
    } finally {
      this.plugin.historyManager.endBulkOperation();
    }

    this.close();

    if (abortCtl.signal.aborted) {
      NoticeManager.info(
        `Bulk move stopped. ${movedCount} file(s) moved, ${errorCount} error(s).`
      );
    } else if (errorCount === 0) {
      NoticeManager.success(`Successfully moved ${movedCount} files!`);
    } else {
      NoticeManager.warning(
        `Moved ${movedCount} files with ${errorCount} errors. Check console for details.`
      );
    }
  }
}
