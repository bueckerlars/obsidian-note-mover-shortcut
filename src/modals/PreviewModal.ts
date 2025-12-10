import { Setting, App, TFile, Notice } from 'obsidian';
import { MovePreview, PreviewEntry } from '../types/MovePreview';
import NoteMoverShortcutPlugin from 'main';
import { NoticeManager } from '../utils/NoticeManager';
import { MobileUtils } from '../utils/MobileUtils';
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
      cls: 'modal-subtitle',
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
        cls: 'modal-empty',
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
        ? 'preview-section preview-section-success preview-section-mobile'
        : 'preview-section preview-section-success'
    );

    const header = section.createEl('div', { cls: 'modal-section-header' });
    header.innerHTML = `<h3>✅ Files to be moved (${entries.length})</h3>`;

    const list = section.createEl('div', {
      cls: isMobile ? 'modal-list modal-list-mobile' : 'modal-list',
    });

    entries.forEach(entry => {
      const item = list.createEl('div', {
        cls: isMobile
          ? 'modal-list-item preview-item-success preview-item-mobile'
          : 'modal-list-item preview-item-success',
      });

      const mainInfo = item.createEl('div', { cls: 'preview-item-main' });
      const fileName = mainInfo.createEl('div', {
        cls: 'preview-item-filename',
      });
      fileName.textContent = entry.fileName;

      const pathInfo = mainInfo.createEl('div', {
        cls: isMobile
          ? 'preview-item-paths preview-item-paths-mobile'
          : 'preview-item-paths',
      });

      if (isMobile) {
        // Mobile: Stack paths vertically
        const currentPathEl = pathInfo.createEl('div', {
          cls: 'preview-path-mobile preview-path-current',
        });
        currentPathEl.textContent = entry.currentPath;

        const arrowEl = pathInfo.createEl('div', {
          cls: 'preview-arrow-mobile',
        });
        arrowEl.textContent = '↓';

        const targetPathEl = pathInfo.createEl('div', {
          cls: 'preview-path-mobile preview-path-target',
        });
        targetPathEl.textContent = entry.targetPath;
      } else {
        // Desktop: Horizontal layout
        pathInfo.innerHTML = `
          <span class="current-path">${entry.currentPath}</span>
          <span class="arrow">→</span>
          <span class="target-path">${entry.targetPath}</span>
        `;
      }

      const details = item.createEl('div', {
        cls: isMobile
          ? 'preview-item-details preview-item-details-mobile'
          : 'preview-item-details',
      });

      if (entry.matchedRule) {
        const rule = details.createEl('div', { cls: 'preview-item-rule' });
        rule.innerHTML = `<span class="rule-label">Rule:</span> <code>${entry.matchedRule}</code>`;
      }

      if (entry.tags && entry.tags.length > 0) {
        const tags = details.createEl('div', { cls: 'preview-item-tags' });
        tags.innerHTML = `<span class="tags-label">Tags:</span> ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}`;
      }
    });
  }

  // createBlockedMovesSection removed - only files that will be moved are shown

  private createActionButtons(container: HTMLElement) {
    const isMobile = MobileUtils.isMobile();
    const footer = container.createEl('div', {
      cls: isMobile ? 'modal-footer modal-footer-mobile' : 'modal-footer',
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
    // Close modal first
    this.close();

    // Execute the moves for successful entries
    const successfulEntries = this.movePreview.successfulMoves;
    let movedCount = 0;
    let errorCount = 0;

    for (const entry of successfulEntries) {
      try {
        // Find the TFile for this entry
        const file = this.app.vault.getAbstractFileByPath(entry.currentPath);
        if (file && file instanceof TFile) {
          // Use the existing move logic from NoteMoverShortcut
          await this.plugin.noteMover.moveFileBasedOnTags(
            file,
            entry.targetPath || '/',
            true
          );
          movedCount++;
        }
      } catch (error) {
        NoticeManager.error(
          `Error moving file ${entry.fileName}: ${error instanceof Error ? error.message : String(error)}`
        );
        errorCount++;
      }
    }

    // Show completion notice
    if (errorCount === 0) {
      NoticeManager.success(`Successfully moved ${movedCount} files!`);
    } else {
      NoticeManager.warning(
        `Moved ${movedCount} files with ${errorCount} errors. Check console for details.`
      );
    }
  }
}
