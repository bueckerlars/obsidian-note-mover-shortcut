import { Setting, App, TFile } from 'obsidian';
import { HistoryManager } from '../core/HistoryManager';
import { BulkOperation, HistoryEntry, TimeFilter } from '../types/HistoryEntry';
import { NoticeManager } from '../utils/NoticeManager';
import {
  NOTIFICATION_CONSTANTS,
  SETTINGS_CONSTANTS,
} from '../config/constants';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';
import NoteMoverShortcutPlugin from 'main';

export class HistoryModal extends BaseModal {
  private currentTimeFilter: TimeFilter = 'all';

  constructor(
    app: App,
    private historyManager: HistoryManager,
    private plugin: NoteMoverShortcutPlugin,
    options: BaseModalOptions = {}
  ) {
    super(app, {
      cssClass: 'note-mover-history-modal',
      size: 'large',
      ...options,
    });
  }

  protected createContent(): void {
    const { contentEl } = this;

    // Create time filter dropdown
    this.createTimeFilterDropdown(contentEl);

    const history = this.historyManager.getFilteredHistory(
      this.currentTimeFilter
    );
    const bulkOperations = this.historyManager.getFilteredBulkOperations(
      this.currentTimeFilter
    );

    if (history.length === 0 && bulkOperations.length === 0) {
      contentEl.createEl('p', {
        text: 'No history entries available for the selected time period.',
      });
      return;
    }

    const historyList = contentEl.createEl('div', {
      cls: 'noteMover-history-list',
    });

    // Create a combined list of operations sorted by timestamp
    const allOperations: Array<
      | { type: 'bulk'; data: BulkOperation }
      | { type: 'single'; data: HistoryEntry }
    > = [];

    // Add bulk operations
    bulkOperations.forEach(bulkOp => {
      allOperations.push({ type: 'bulk', data: bulkOp });
    });

    // Add ONLY single operations that are NOT part of any bulk operation
    const singleEntries = history.filter(entry => !entry.bulkOperationId);
    singleEntries.forEach(entry => {
      allOperations.push({ type: 'single', data: entry });
    });

    // Sort by timestamp (most recent first)
    allOperations.sort((a, b) => b.data.timestamp - a.data.timestamp);

    allOperations.forEach(operation => {
      if (operation.type === 'bulk') {
        this.createBulkOperationEntry(historyList, operation.data);
      } else {
        this.createSingleEntry(historyList, operation.data);
      }
    });
  }

  private createTimeFilterDropdown(container: HTMLElement): void {
    const isMobile = MobileUtils.isMobile();
    const filterContainer = container.createEl('div', {
      cls: isMobile
        ? 'noteMover-time-filter-container noteMover-time-filter-container-mobile'
        : 'noteMover-time-filter-container',
    });

    const setting = new Setting(filterContainer)
      .setName(SETTINGS_CONSTANTS.UI_TEXTS.TIME_FILTER_LABEL)
      .addDropdown(dropdown => {
        dropdown
          .addOption('all', SETTINGS_CONSTANTS.UI_TEXTS.TIME_FILTER_ALL)
          .addOption('today', SETTINGS_CONSTANTS.UI_TEXTS.TIME_FILTER_TODAY)
          .addOption('week', SETTINGS_CONSTANTS.UI_TEXTS.TIME_FILTER_WEEK)
          .addOption('month', SETTINGS_CONSTANTS.UI_TEXTS.TIME_FILTER_MONTH)
          .setValue(this.currentTimeFilter)
          .onChange((value: string) => {
            this.currentTimeFilter = value as TimeFilter;
            this.refreshContent();
          });

        // Mobile: Make dropdown larger
        if (isMobile) {
          const selectEl = dropdown.selectEl;
          selectEl.style.minHeight = '48px';
          selectEl.style.fontSize = '16px';
        }
      });
  }

  private refreshContent(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.createContent();
  }

  private createBulkOperationEntry(
    container: HTMLElement,
    bulkOp: BulkOperation
  ) {
    const isMobile = MobileUtils.isMobile();
    const bulkEntryEl = container.createEl('div', {
      cls: isMobile
        ? 'noteMover-history-entry noteMover-bulk-operation noteMover-history-entry-mobile'
        : 'noteMover-history-entry noteMover-bulk-operation',
    });

    const headerEl = bulkEntryEl.createEl('div', {
      cls: 'noteMover-bulk-header',
    });
    const date = new Date(bulkOp.timestamp);
    const formattedDate = date.toLocaleString('en-US');

    const operationTypeText =
      bulkOp.operationType === 'bulk' ? 'Bulk Move' : 'Periodic Move';
    const operationIcon = bulkOp.operationType === 'bulk' ? '📦' : '🕐';

    headerEl.createEl('div', {
      cls: 'noteMover-bulk-operation-info',
      text: `${operationIcon} ${operationTypeText}: ${bulkOp.totalFiles} files - ${formattedDate}`,
    });

    // Expandable details (opened by default)
    const detailsEl = bulkEntryEl.createEl('details', {
      cls: 'noteMover-bulk-details',
    });
    detailsEl.open = true;
    const summaryEl = detailsEl.createEl('summary', { text: 'Hide files' });
    const filesListEl = detailsEl.createEl('div', {
      cls: 'noteMover-bulk-files-list',
    });

    // Update summary text based on open state
    detailsEl.addEventListener('toggle', () => {
      summaryEl.textContent = detailsEl.open ? 'Hide files' : 'Show files';
    });

    // Sort entries by timestamp for consistent display
    const sortedEntries = [...bulkOp.entries].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    sortedEntries.forEach(entry => {
      const fileEl = filesListEl.createEl('div', {
        cls: 'noteMover-history-entry noteMover-bulk-file-entry',
      });

      const contentEl = fileEl.createEl('div', {
        cls: 'noteMover-history-entry-content',
      });
      const date = new Date(entry.timestamp);
      const formattedDate = date.toLocaleString('en-US');

      contentEl.createEl('div', {
        cls: 'noteMover-history-entry-info',
        text: `📄 ${entry.fileName} - ${formattedDate}`,
      });

      contentEl.createEl('div', {
        cls: 'noteMover-history-entry-paths',
        text: `${entry.sourcePath} → ${entry.destinationPath}`,
      });

      // Individual buttons for each file
      const isMobile = MobileUtils.isMobile();
      if (isMobile) {
        // Mobile: Stack buttons vertically
        const buttonsContainer = fileEl.createDiv({
          cls: 'noteMover-history-entry-buttons-mobile',
        });

        // Open button
        const openBtn = buttonsContainer.createEl('button', {
          cls: 'noteMover-history-entry-button-mobile',
          text: 'Open',
        });
        openBtn.onclick = () => {
          const file = this.app.vault.getAbstractFileByPath(
            entry.destinationPath
          );
          if (file && file instanceof TFile) {
            this.app.workspace.getLeaf().openFile(file);
            this.close();
          } else {
            const sourceFile = this.app.vault.getAbstractFileByPath(
              entry.sourcePath
            );
            if (sourceFile && sourceFile instanceof TFile) {
              this.app.workspace.getLeaf().openFile(sourceFile);
              this.close();
            } else {
              NoticeManager.error(`Could not find file ${entry.fileName}`, {
                duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE,
              });
            }
          }
        };

        // Undo button
        const undoBtn = buttonsContainer.createEl('button', {
          cls: 'noteMover-history-entry-button-mobile',
          text: 'Undo',
        });
        undoBtn.onclick = async () => {
          const success = await this.historyManager.undoEntry(entry.id);
          if (success) {
            this.onOpen();
          } else {
            NoticeManager.error(
              `Could not undo move for ${entry.fileName}. File may have been moved or deleted.`,
              { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
            );
          }
        };

        // Blacklist button
        const blacklistBtn = buttonsContainer.createEl('button', {
          cls: 'noteMover-history-entry-button-mobile noteMover-history-entry-button-warning',
          text: 'Add to Blacklist',
        });
        blacklistBtn.onclick = async () => {
          await this.plugin.noteMover.addFileToBlacklist(entry.fileName);
        };
      } else {
        // Desktop: Original horizontal layout
        new Setting(fileEl)
          .addButton(button => {
            button
              .setIcon('file-text')
              .setTooltip(`Open ${entry.fileName}`)
              .onClick(() => {
                const file = this.app.vault.getAbstractFileByPath(
                  entry.destinationPath
                );
                if (file && file instanceof TFile) {
                  this.app.workspace.getLeaf().openFile(file);
                  this.close();
                } else {
                  const sourceFile = this.app.vault.getAbstractFileByPath(
                    entry.sourcePath
                  );
                  if (sourceFile && sourceFile instanceof TFile) {
                    this.app.workspace.getLeaf().openFile(sourceFile);
                    this.close();
                  } else {
                    NoticeManager.error(
                      `Could not find file ${entry.fileName}`,
                      {
                        duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE,
                      }
                    );
                  }
                }
              });
          })
          .addButton(button => {
            button
              .setIcon('undo')
              .setTooltip(`Undo move for ${entry.fileName}`)
              .onClick(async () => {
                const success = await this.historyManager.undoEntry(entry.id);
                if (success) {
                  this.onOpen();
                } else {
                  NoticeManager.error(
                    `Could not undo move for ${entry.fileName}. File may have been moved or deleted.`,
                    { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
                  );
                }
              });
          })
          .addButton(button => {
            button
              .setIcon('ban')
              .setTooltip(`Add ${entry.fileName} to blacklist`)
              .onClick(async () => {
                await this.plugin.noteMover.addFileToBlacklist(entry.fileName);
              });
          });
      }
    });

    // Bulk undo button
    const bulkUndoSetting = new Setting(bulkEntryEl).addButton(button => {
      button
        .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.UNDO_ALL)
        .setIcon('undo')
        .setTooltip(`Undo entire ${operationTypeText.toLowerCase()}`)
        .onClick(async () => {
          const success = await this.historyManager.undoBulkOperation(
            bulkOp.id
          );
          if (success) {
            this.onOpen();
          } else {
            NoticeManager.warning(
              'Some files could not be moved back. Check console for details.',
              { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
            );
          }
        });
    });

    // Mobile: Make button full-width
    if (MobileUtils.isMobile()) {
      const buttonEl = bulkUndoSetting.settingEl.querySelector('button');
      if (buttonEl) {
        buttonEl.style.width = '100%';
        buttonEl.style.minHeight = '48px';
      }
    }
  }

  private createSingleEntry(container: HTMLElement, entry: HistoryEntry) {
    const isMobile = MobileUtils.isMobile();
    const entryEl = container.createEl('div', {
      cls: isMobile
        ? 'noteMover-history-entry noteMover-single-operation noteMover-history-entry-mobile'
        : 'noteMover-history-entry noteMover-single-operation',
    });

    const contentEl = entryEl.createEl('div', {
      cls: 'noteMover-history-entry-content',
    });
    const date = new Date(entry.timestamp);
    const formattedDate = date.toLocaleString('en-US');

    contentEl.createEl('div', {
      cls: 'noteMover-history-entry-info',
      text: `📄 ${entry.fileName} - ${formattedDate}`,
    });

    contentEl.createEl('div', {
      cls: 'noteMover-history-entry-paths',
      text: `${entry.sourcePath} → ${entry.destinationPath}`,
    });

    if (isMobile) {
      // Mobile: Stack buttons vertically
      const buttonsContainer = entryEl.createDiv({
        cls: 'noteMover-history-entry-buttons-mobile',
      });

      // Open button
      const openBtn = buttonsContainer.createEl('button', {
        cls: 'noteMover-history-entry-button-mobile',
        text: 'Open',
      });
      openBtn.onclick = () => {
        const file = this.app.vault.getAbstractFileByPath(
          entry.destinationPath
        );
        if (file && file instanceof TFile) {
          this.app.workspace.getLeaf().openFile(file);
          this.close();
        } else {
          const sourceFile = this.app.vault.getAbstractFileByPath(
            entry.sourcePath
          );
          if (sourceFile && sourceFile instanceof TFile) {
            this.app.workspace.getLeaf().openFile(sourceFile);
            this.close();
          } else {
            NoticeManager.error(`Could not find file ${entry.fileName}`, {
              duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE,
            });
          }
        }
      };

      // Undo button
      const undoBtn = buttonsContainer.createEl('button', {
        cls: 'noteMover-history-entry-button-mobile',
        text: 'Undo',
      });
      undoBtn.onclick = async () => {
        const success = await this.historyManager.undoEntry(entry.id);
        if (success) {
          this.onOpen();
        }
      };

      // Blacklist button
      const blacklistBtn = buttonsContainer.createEl('button', {
        cls: 'noteMover-history-entry-button-mobile noteMover-history-entry-button-warning',
        text: 'Add to Blacklist',
      });
      blacklistBtn.onclick = async () => {
        await this.plugin.noteMover.addFileToBlacklist(entry.fileName);
      };
    } else {
      // Desktop: Original horizontal layout
      new Setting(entryEl)
        .addButton(button => {
          button
            .setIcon('file-text')
            .setTooltip(`Open ${entry.fileName}`)
            .onClick(() => {
              const file = this.app.vault.getAbstractFileByPath(
                entry.destinationPath
              );
              if (file && file instanceof TFile) {
                this.app.workspace.getLeaf().openFile(file);
                this.close();
              } else {
                const sourceFile = this.app.vault.getAbstractFileByPath(
                  entry.sourcePath
                );
                if (sourceFile && sourceFile instanceof TFile) {
                  this.app.workspace.getLeaf().openFile(sourceFile);
                  this.close();
                } else {
                  NoticeManager.error(`Could not find file ${entry.fileName}`, {
                    duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE,
                  });
                }
              }
            });
        })
        .addButton(button => {
          button
            .setIcon('undo')
            .setTooltip('Undo')
            .onClick(async () => {
              const success = await this.historyManager.undoEntry(entry.id);
              if (success) {
                this.onOpen();
              }
            });
        })
        .addButton(button => {
          button
            .setIcon('ban')
            .setTooltip(`Add ${entry.fileName} to blacklist`)
            .onClick(async () => {
              await this.plugin.noteMover.addFileToBlacklist(entry.fileName);
            });
        });
    }
  }

  onClose() {
    super.onClose();
  }
}
