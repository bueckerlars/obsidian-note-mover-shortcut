import { Setting, App, TFile, Menu, setIcon, setTooltip } from 'obsidian';
import { HistoryManager } from '../core/HistoryManager';
import { HistoryEntry, TimeFilter } from '../types/HistoryEntry';
import { NoticeManager } from '../utils/NoticeManager';
import { NOTIFICATION_CONSTANTS } from '../config/constants';
import { fill, strings } from '../i18n/locale';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';
import AdvancedNoteMoverPlugin from 'main';
import {
  groupHistoryByDay,
  type HistoryAction,
  type HistoryRow,
} from '../domain/history/historyGrouping';

const ACTION_ICONS: Record<HistoryAction, string> = {
  open: 'file-text',
  undo: 'undo',
  blacklist: 'ban',
};

export class HistoryModal extends BaseModal {
  private currentTimeFilter: TimeFilter = 'all';

  constructor(
    app: App,
    private historyManager: HistoryManager,
    private plugin: AdvancedNoteMoverPlugin,
    options: BaseModalOptions = {}
  ) {
    super(app, {
      title: strings().modals.historyTitle,
      cssClass: 'advancedNoteMover-history-modal',
      size: 'large',
      ...options,
    });
  }

  protected createContent(): void {
    const { contentEl } = this;
    this.createTimeFilterDropdown(contentEl);

    const entries = this.visibleEntries();
    const byId = new Map(entries.map(entry => [entry.id, entry]));
    const groups = groupHistoryByDay(
      entries,
      strings().modals.historyUnknownRule
    );
    if (groups.length === 0) {
      contentEl.createDiv({
        cls: 'advancedNoteMover-modal-empty',
        text: strings().modals.historyEmpty,
      });
      return;
    }

    const historyList = contentEl.createDiv({
      cls: 'advancedNoteMover-history-list',
    });
    for (const group of groups) {
      const day = historyList.createDiv({
        cls: 'advancedNoteMover-history-day',
      });
      day.createDiv({
        cls: 'advancedNoteMover-history-day-label',
        text: group.day,
      });
      for (const row of group.rows) {
        const entry = byId.get(row.id);
        if (entry) {
          this.renderRow(day, row, entry);
        }
      }
    }
  }

  private visibleEntries(): HistoryEntry[] {
    const entries = this.historyManager.getFilteredHistory(
      this.currentTimeFilter
    );
    const seen = new Set(entries.map(entry => entry.id));
    const combined = [...entries];
    for (const bulk of this.historyManager.getFilteredBulkOperations(
      this.currentTimeFilter
    )) {
      for (const entry of bulk.entries) {
        if (seen.has(entry.id)) {
          continue;
        }
        seen.add(entry.id);
        combined.push(entry);
      }
    }
    return combined;
  }

  private createTimeFilterDropdown(container: HTMLElement): void {
    const filterContainer = container.createDiv({
      cls: 'advancedNoteMover-time-filter-container',
    });

    new Setting(filterContainer)
      .setName(strings().modals.historyTimeFilter)
      .addDropdown(dropdown => {
        dropdown
          .addOption('all', strings().modals.historyAll)
          .addOption('today', strings().modals.historyToday)
          .addOption('week', strings().modals.historyWeek)
          .addOption('month', strings().modals.historyMonth)
          .setValue(this.currentTimeFilter)
          .onChange((value: string) => {
            this.currentTimeFilter = value as TimeFilter;
            this.refreshContent();
          });
      });
  }

  private refreshContent(): void {
    this.contentEl.empty();
    this.createContent();
  }

  private renderRow(
    container: HTMLElement,
    row: HistoryRow,
    entry: HistoryEntry
  ): void {
    const entryEl = container.createDiv({
      cls: 'advancedNoteMover-history-entry',
    });
    const contentEl = entryEl.createDiv({
      cls: 'advancedNoteMover-history-entry-content',
    });
    const title = contentEl.createDiv({
      cls: 'advancedNoteMover-history-entry-info',
    });
    const iconEl = title.createSpan({ cls: 'advancedNoteMover-icon' });
    iconEl.ariaHidden = 'true';
    setIcon(iconEl, 'file-text');
    title.createSpan({ text: entry.fileName });
    contentEl.createDiv({
      cls: 'advancedNoteMover-history-entry-meta',
      text: fill(strings().modals.historyMeta, {
        time: row.time,
        rule: row.ruleName,
      }),
    });
    contentEl.createDiv({
      cls: 'advancedNoteMover-history-entry-paths',
      text: fill(strings().modals.historyPathLine, {
        source: entry.sourcePath,
        destination: entry.destinationPath,
      }),
    });

    const actions = entryEl.createDiv({
      cls: 'advancedNoteMover-history-actions',
    });
    this.renderActions(actions, entry, row);
  }

  private renderActions(
    container: HTMLElement,
    entry: HistoryEntry,
    row: HistoryRow
  ): void {
    const labels = this.actionLabels(entry);
    const run = this.actionHandlers(entry);
    if (MobileUtils.isMobile()) {
      const button = container.createEl('button', {
        cls: 'clickable-icon advancedNoteMover-history-action',
      });
      button.setAttribute('aria-label', strings().modals.historyActions);
      setTooltip(button, strings().modals.historyActions);
      setIcon(button, 'more-horizontal');
      button.addEventListener('click', () => {
        const menu = new Menu();
        for (const action of row.actions) {
          menu.addItem(item =>
            item
              .setTitle(labels[action])
              .setIcon(ACTION_ICONS[action])
              .onClick(run[action])
          );
        }
        const rect = button.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom });
      });
      return;
    }

    for (const action of row.actions) {
      const button = container.createEl('button', {
        cls: 'clickable-icon advancedNoteMover-history-action',
      });
      setIcon(button, ACTION_ICONS[action]);
      button.setAttribute('aria-label', labels[action]);
      setTooltip(button, labels[action]);
      button.addEventListener('click', run[action]);
    }
  }

  private actionLabels(entry: HistoryEntry): Record<HistoryAction, string> {
    return {
      open: fill(strings().notices.openFile, { fileName: entry.fileName }),
      undo: fill(strings().notices.undoMoveFor, { fileName: entry.fileName }),
      blacklist: fill(strings().notices.addNamedFileToBlacklist, {
        fileName: entry.fileName,
      }),
    };
  }

  private actionHandlers(
    entry: HistoryEntry
  ): Record<HistoryAction, () => void> {
    return {
      open: () => this.openEntry(entry),
      undo: () => {
        void this.undoEntry(entry);
      },
      blacklist: () => {
        void this.plugin.advancedNoteMover.addFileToBlacklist(entry.fileName);
      },
    };
  }

  private fileFor(entry: HistoryEntry): TFile | null {
    const destination = this.app.vault.getAbstractFileByPath(
      entry.destinationPath
    );
    if (destination instanceof TFile) {
      return destination;
    }
    const source = this.app.vault.getAbstractFileByPath(entry.sourcePath);
    return source instanceof TFile ? source : null;
  }

  private openEntry(entry: HistoryEntry): void {
    const file = this.fileFor(entry);
    if (!file) {
      NoticeManager.error(
        fill(strings().notices.couldNotFindFile, { fileName: entry.fileName }),
        { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
      );
      return;
    }
    void this.app.workspace.getLeaf().openFile(file);
    this.close();
  }

  private async undoEntry(entry: HistoryEntry): Promise<void> {
    const success = await this.historyManager.undoEntry(entry.id);
    if (success) {
      this.refreshContent();
      return;
    }
    NoticeManager.error(
      fill(strings().notices.couldNotUndoMove, { fileName: entry.fileName }),
      { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
    );
  }
}
