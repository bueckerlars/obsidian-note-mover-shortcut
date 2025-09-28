import { Setting, App, TFile } from 'obsidian';
import { HistoryManager } from '../core/HistoryManager';
import { BulkOperation, HistoryEntry, TimeFilter } from '../types/HistoryEntry';
import { NoticeManager } from '../utils/NoticeManager';
import {
  NOTIFICATION_CONSTANTS,
  SETTINGS_CONSTANTS,
} from '../config/constants';
import { BaseModal, BaseModalOptions } from './BaseModal';
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

    const historyList = contentEl.createEl('div', { cls: 'history-list' });

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
    const filterContainer = container.createEl('div', {
      cls: 'time-filter-container',
    });

    new Setting(filterContainer)
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
    const bulkEntryEl = container.createEl('div', {
      cls: 'history-entry bulk-operation',
    });

    const headerEl = bulkEntryEl.createEl('div', { cls: 'bulk-header' });
    const date = new Date(bulkOp.timestamp);
    const formattedDate = date.toLocaleString('en-US');

    const operationTypeText =
      bulkOp.operationType === 'bulk' ? 'Bulk Move' : 'Periodic Move';
    const operationIcon = bulkOp.operationType === 'bulk' ? '📦' : '🕐';

    headerEl.createEl('div', {
      cls: 'bulk-operation-info',
      text: `${operationIcon} ${operationTypeText}: ${bulkOp.totalFiles} files - ${formattedDate}`,
    });

    // Expandable details (opened by default)
    const detailsEl = bulkEntryEl.createEl('details', { cls: 'bulk-details' });
    detailsEl.open = true;
    const summaryEl = detailsEl.createEl('summary', { text: 'Hide files' });
    const filesListEl = detailsEl.createEl('div', { cls: 'bulk-files-list' });

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
        cls: 'history-entry bulk-file-entry',
      });

      const contentEl = fileEl.createEl('div', {
        cls: 'history-entry-content',
      });
      const date = new Date(entry.timestamp);
      const formattedDate = date.toLocaleString('en-US');

      contentEl.createEl('div', {
        cls: 'history-entry-info',
        text: `📄 ${entry.fileName} - ${formattedDate}`,
      });

      contentEl.createEl('div', {
        cls: 'history-entry-paths',
        text: `${entry.sourcePath} → ${entry.destinationPath}`,
      });

      // Individual buttons for each file
      new Setting(fileEl)
        .addButton(button => {
          button
            .setIcon('file-text')
            .setTooltip(`Open ${entry.fileName}`)
            .onClick(() => {
              // Try to open the file at its current location (destination path)
              const file = this.app.vault.getAbstractFileByPath(
                entry.destinationPath
              );
              if (file && file instanceof TFile) {
                this.app.workspace.getLeaf().openFile(file);
                this.close(); // Close the modal after opening the file
              } else {
                // If file not found at destination, try source path
                const sourceFile = this.app.vault.getAbstractFileByPath(
                  entry.sourcePath
                );
                if (sourceFile && sourceFile instanceof TFile) {
                  this.app.workspace.getLeaf().openFile(sourceFile);
                  this.close(); // Close the modal after opening the file
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
            .setTooltip(`Undo move for ${entry.fileName}`)
            .onClick(async () => {
              const success = await this.historyManager.undoEntry(entry.id);
              if (success) {
                this.onOpen(); // Refresh the modal
              } else {
                // Show error message
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
    });

    // Bulk undo button
    new Setting(bulkEntryEl).addButton(button => {
      button
        .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.UNDO_ALL)
        .setIcon('undo')
        .setTooltip(`Undo entire ${operationTypeText.toLowerCase()}`)
        .onClick(async () => {
          const success = await this.historyManager.undoBulkOperation(
            bulkOp.id
          );
          if (success) {
            this.onOpen(); // Refresh the modal
          } else {
            // Show error message
            NoticeManager.warning(
              'Some files could not be moved back. Check console for details.',
              { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
            );
          }
        });
    });
  }

  private createSingleEntry(container: HTMLElement, entry: HistoryEntry) {
    const entryEl = container.createEl('div', {
      cls: 'history-entry single-operation',
    });

    const contentEl = entryEl.createEl('div', { cls: 'history-entry-content' });
    const date = new Date(entry.timestamp);
    const formattedDate = date.toLocaleString('en-US');

    contentEl.createEl('div', {
      cls: 'history-entry-info',
      text: `📄 ${entry.fileName} - ${formattedDate}`,
    });

    contentEl.createEl('div', {
      cls: 'history-entry-paths',
      text: `${entry.sourcePath} → ${entry.destinationPath}`,
    });

    new Setting(entryEl)
      .addButton(button => {
        button
          .setIcon('file-text')
          .setTooltip(`Open ${entry.fileName}`)
          .onClick(() => {
            // Try to open the file at its current location (destination path)
            const file = this.app.vault.getAbstractFileByPath(
              entry.destinationPath
            );
            if (file && file instanceof TFile) {
              this.app.workspace.getLeaf().openFile(file);
              this.close(); // Close the modal after opening the file
            } else {
              // If file not found at destination, try source path
              const sourceFile = this.app.vault.getAbstractFileByPath(
                entry.sourcePath
              );
              if (sourceFile && sourceFile instanceof TFile) {
                this.app.workspace.getLeaf().openFile(sourceFile);
                this.close(); // Close the modal after opening the file
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

  onClose() {
    super.onClose();
  }
}
