import { Setting, App, TFile, Notice } from 'obsidian';
import { MovePreview, PreviewEntry } from '../types/MovePreview';
import NoteMoverShortcutPlugin from 'main';
import { NoticeManager } from '../utils/NoticeManager';
import { MobileUtils } from '../utils/MobileUtils';
import { combinePath, ensureFolderExists } from '../utils/PathUtils';
import { handleError, createError } from '../utils/Error';
import { BaseModal, BaseModalOptions } from './BaseModal';

export class PreviewModal extends BaseModal {
  private movePreview: MovePreview;

  constructor(
    app: App,
    private plugin: NoteMoverShortcutPlugin,
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
      cls: 'noteMover-modal-subtitle',
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
        cls: 'noteMover-modal-empty',
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
        ? 'noteMover-preview-section noteMover-preview-section-success noteMover-preview-section-mobile'
        : 'noteMover-preview-section noteMover-preview-section-success'
    );

    const header = section.createEl('div', {
      cls: 'noteMover-modal-section-header',
    });
    header.innerHTML = `<h3>✅ Files to be moved (${entries.length})</h3>`;

    const list = section.createEl('div', {
      cls: isMobile
        ? 'noteMover-modal-list noteMover-modal-list-mobile'
        : 'noteMover-modal-list',
    });

    entries.forEach(entry => {
      const item = list.createEl('div', {
        cls: isMobile
          ? 'noteMover-modal-list-item noteMover-preview-item-success noteMover-preview-item-mobile'
          : 'noteMover-modal-list-item noteMover-preview-item-success',
      });

      const mainInfo = item.createEl('div', {
        cls: 'noteMover-preview-item-main',
      });
      const fileName = mainInfo.createEl('div', {
        cls: 'noteMover-preview-item-filename',
      });
      fileName.textContent = entry.fileName;

      const pathInfo = mainInfo.createEl('div', {
        cls: isMobile
          ? 'noteMover-preview-item-paths noteMover-preview-item-paths-mobile'
          : 'noteMover-preview-item-paths',
      });

      if (isMobile) {
        // Mobile: Stack paths vertically
        const currentPathEl = pathInfo.createEl('div', {
          cls: 'noteMover-preview-path-mobile noteMover-preview-path-current',
        });
        currentPathEl.textContent = entry.currentPath;

        const arrowEl = pathInfo.createEl('div', {
          cls: 'noteMover-preview-arrow-mobile',
        });
        arrowEl.textContent = '↓';

        const targetPathEl = pathInfo.createEl('div', {
          cls: 'noteMover-preview-path-mobile noteMover-preview-path-target',
        });
        targetPathEl.textContent = entry.targetPath;
      } else {
        // Desktop: Horizontal layout
        pathInfo.innerHTML = `
          <span class="noteMover-current-path">${entry.currentPath}</span>
          <span class="noteMover-arrow">→</span>
          <span class="noteMover-target-path">${entry.targetPath}</span>
        `;
      }

      const details = item.createEl('div', {
        cls: isMobile
          ? 'noteMover-preview-item-details noteMover-preview-item-details-mobile'
          : 'noteMover-preview-item-details',
      });

      if (entry.matchedRule) {
        const rule = details.createEl('div', {
          cls: 'noteMover-preview-item-rule',
        });
        rule.innerHTML = `<span class="noteMover-rule-label">Rule:</span> <code>${entry.matchedRule}</code>`;
      }

      if (entry.tags && entry.tags.length > 0) {
        const tags = details.createEl('div', {
          cls: 'noteMover-preview-item-tags',
        });
        tags.innerHTML = `<span class="noteMover-tags-label">Tags:</span> ${entry.tags.map(tag => `<span class="noteMover-tag">${tag}</span>`).join(' ')}`;
      }
    });
  }

  // createBlockedMovesSection removed - only files that will be moved are shown

  private createActionButtons(container: HTMLElement) {
    const isMobile = MobileUtils.isMobile();
    const footer = container.createEl('div', {
      cls: isMobile
        ? 'noteMover-modal-footer noteMover-modal-footer-mobile'
        : 'noteMover-modal-footer',
    });

    const buttonContainer = this.createButtonContainer(footer);

    if (isMobile) {
      // Mobile: Stack buttons vertically
      // Execute moves button (only if there are moves to execute)
      if (this.movePreview.successfulMoves.length > 0) {
        const executeSetting = new Setting(buttonContainer).addButton(btn => {
          btn
            .setButtonText(
              `Move ${this.movePreview.successfulMoves.length} files`
            )
            .setCta()
            .onClick(() => {
              this.executeMoves();
            });
        });
        const executeBtn = executeSetting.settingEl.querySelector('button');
        if (executeBtn) {
          executeBtn.style.width = '100%';
          executeBtn.style.minHeight = '48px';
        }
      }

      // Cancel button
      const cancelSetting = new Setting(buttonContainer).addButton(btn => {
        btn.setButtonText('Cancel').onClick(() => {
          this.close();
        });
      });
      const cancelBtn = cancelSetting.settingEl.querySelector('button');
      if (cancelBtn) {
        cancelBtn.style.width = '100%';
        cancelBtn.style.minHeight = '48px';
      }
    } else {
      // Desktop: Original horizontal layout
      // Cancel button
      this.createButton(buttonContainer, 'Cancel', () => {
        this.close();
      });

      // Execute moves button (only if there are moves to execute)
      if (this.movePreview.successfulMoves.length > 0) {
        this.createButton(
          buttonContainer,
          `Move ${this.movePreview.successfulMoves.length} files`,
          () => {
            this.executeMoves();
          },
          {
            isPrimary: true,
          }
        );
      }
    }
  }

  private async executeMoves() {
    this.close();

    const successfulEntries = this.movePreview.successfulMoves;
    let movedCount = 0;
    let errorCount = 0;

    const bulkOperationId =
      this.plugin.historyManager.startBulkOperation('bulk');

    try {
      for (const entry of successfulEntries) {
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

          this.plugin.historyManager.markPluginMoveStart();
          try {
            await this.app.fileManager.renameFile(file, newPath);
            this.plugin.historyManager.addEntry({
              sourcePath: entry.currentPath,
              destinationPath: newPath,
              fileName: file.name,
            });
            movedCount++;
          } finally {
            this.plugin.historyManager.markPluginMoveEnd();
          }
        } catch (error) {
          handleError(error, `Error moving file ${entry.fileName}`, false);
          errorCount++;
        }
      }
    } finally {
      this.plugin.historyManager.endBulkOperation();
    }

    if (errorCount === 0) {
      NoticeManager.success(`Successfully moved ${movedCount} files!`);
    } else {
      NoticeManager.warning(
        `Moved ${movedCount} files with ${errorCount} errors. Check console for details.`
      );
    }
  }
}
