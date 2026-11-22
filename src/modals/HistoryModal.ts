import { App, DropdownComponent, Menu, TFile, setTooltip } from 'obsidian';
import { HistoryManager } from '../core/HistoryManager';
import { HistoryEntry, TimeFilter } from '../types/HistoryEntry';
import { formatDayHeading } from '../utils/formatDate';
import { MobileUtils } from '../utils/MobileUtils';
import { NoticeManager } from '../utils/NoticeManager';
import { HISTORY_CONSTANTS, NOTIFICATION_CONSTANTS } from '../config/constants';
import { fill, plural, strings } from '../i18n/locale';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { renderModalFooter } from './modalFooter';
import { iconSpan, setAttrs } from './modalDom';
import AdvancedNoteMoverPlugin from 'main';
import {
  buildHistoryView,
  historyRuleNames,
  type HistoryGroupItem,
  type HistoryRow,
} from '../domain/history/historyGrouping';
import {
  FOREVER,
  retentionDaysLabel,
  retentionToKey,
} from '../settings/historyRetention';

export class HistoryModal extends BaseModal {
  private range: TimeFilter = 'month';
  private rule: string | null = null;
  private query = '';
  private subEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private entries = new Map<string, HistoryEntry>();
  private readonly collapsed = new Set<string>();

  constructor(
    app: App,
    private historyManager: HistoryManager,
    private plugin: AdvancedNoteMoverPlugin,
    options: BaseModalOptions = {}
  ) {
    super(app, {
      title: strings().modals.historyTitle,
      cssClass: 'advancedNoteMover-history-modal',
      focusSelector: 'input',
      ...options,
    });
  }

  protected createContent(): void {
    const { contentEl } = this;
    this.modalEl.addClass('advancedNoteMover-history-shell');
    this.loadEntries();
    if (MobileUtils.isPhone()) {
      // Phone: bulk operations start closed, like navigation rows.
      for (const bulk of this.historyManager.getBulkOperations()) {
        this.collapsed.add(bulk.id);
      }
    }
    this.subEl = contentEl.createEl('p', {
      cls: 'advancedNoteMover-modal-sub',
      text: this.subtitle(),
    });
    this.renderToolbar(contentEl);
    this.listEl = contentEl.createDiv({
      cls: 'advancedNoteMover-preview-scroll',
    });
    this.renderList();
    this.renderFooter();
  }

  /** History plus the notes of bulk operations that dropped out of it. */
  private loadEntries(): void {
    this.entries = new Map(
      this.historyManager.getHistory().map(entry => [entry.id, entry])
    );
    for (const bulk of this.historyManager.getBulkOperations()) {
      for (const entry of bulk.entries) {
        if (!this.entries.has(entry.id)) this.entries.set(entry.id, entry);
      }
    }
  }

  private retentionDays(): number | null {
    const policy =
      this.plugin.pluginData.settings.retentionPolicy ??
      HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY;
    const key = retentionToKey(policy);
    return key === FOREVER ? null : Number(key);
  }

  private subtitle(): string {
    const text = strings().modals;
    const moves = [...this.entries.values()].filter(e => !e.undone).length;
    const count = plural(moves, 'move', 'moves');
    const days = this.retentionDays();
    return days === null
      ? fill(text.historySubtitleAll, { moves: count })
      : fill(text.historySubtitle, {
          moves: count,
          period: retentionDaysLabel(days),
        });
  }

  private renderToolbar(parent: HTMLElement): void {
    const text = strings().modals;
    const row = parent.createDiv({ cls: 'advancedNoteMover-preview-toolbar' });
    const field = row.createDiv({ cls: 'advancedNoteMover-search-field' });
    iconSpan(field, 'search');
    const input = field.createEl('input', { type: 'search' });
    setAttrs(input, {
      placeholder: text.historySearch,
      'aria-label': text.historySearch,
    });
    input.addEventListener('input', () => {
      this.query = input.value;
      this.renderList();
    });

    const names = historyRuleNames(
      [...this.entries.values()],
      (this.plugin.pluginData.settings.rulesV2 ?? []).map(rule => rule.name)
    );
    new DropdownComponent(row)
      .addOption('', text.historyAllRules)
      .addOptions(Object.fromEntries(names.map(name => [name, name])))
      .setValue('')
      .onChange(value => {
        this.rule = value || null;
        this.renderList();
      })
      .selectEl.setAttribute('aria-label', text.historyAllRules);

    new DropdownComponent(row)
      .addOption('month', text.historyRangeMonth)
      .addOption('today', text.historyToday)
      .addOption('week', text.historyRangeWeek)
      .addOption('all', text.historyRangeAll)
      .setValue(this.range)
      .onChange(value => {
        this.range = value as TimeFilter;
        this.renderList();
      })
      .selectEl.setAttribute('aria-label', text.historyRangeLabel);

    this.renderFilterButton(row, names);
  }

  /** Phone: one round button opens a menu with the rule and time filters. */
  private renderFilterButton(row: HTMLElement, names: string[]): void {
    const text = strings().modals;
    const button = row.createEl('button', {
      cls: 'clickable-icon advancedNoteMover-filter-button',
      attr: {
        type: 'button',
        'aria-label': text.historyFilterLabel,
        'aria-haspopup': 'menu',
      },
    });
    iconSpan(button, 'filter');
    button.addEventListener('click', () => {
      const rect = button.getBoundingClientRect();
      const menu = new Menu();
      const rules: [string | null, string][] = [
        [null, text.historyAllRules],
        ...names.map((name): [string, string] => [name, name]),
      ];
      for (const [value, label] of rules) {
        menu.addItem(item =>
          item
            .setTitle(label)
            .setChecked(this.rule === value)
            .onClick(() => {
              this.rule = value;
              this.renderList();
            })
        );
      }
      menu.addSeparator();
      const ranges: [TimeFilter, string][] = [
        ['today', text.historyToday],
        ['week', text.historyRangeWeek],
        ['month', text.historyRangeMonth],
        ['all', text.historyRangeAll],
      ];
      for (const [value, label] of ranges) {
        menu.addItem(item =>
          item
            .setTitle(label)
            .setChecked(this.range === value)
            .onClick(() => {
              this.range = value;
              this.renderList();
            })
        );
      }
      menu.showAtPosition({ x: rect.right, y: rect.bottom });
    });
  }

  private renderList(): void {
    const list = this.listEl;
    if (!list) return;
    list.empty();
    const text = strings().modals;
    const all = [...this.entries.values()];
    const days = buildHistoryView(
      all,
      this.historyManager.getBulkOperations(),
      {
        query: this.query,
        rule: this.rule,
        range: this.range,
        now: Date.now(),
        rootLabel: text.previewVaultRoot,
      }
    );
    if (days.length === 0) {
      list.createDiv({
        cls: 'advancedNoteMover-preview-no-results',
        text: all.length === 0 ? text.historyEmpty : text.historyNoResults,
      });
      return;
    }
    for (const day of days) {
      const dayEl = list.createDiv({ cls: 'advancedNoteMover-history-day' });
      dayEl.createDiv({
        cls: 'advancedNoteMover-list-head',
        text: formatDayHeading(day.timestamp, {
          today: text.historyToday,
          yesterday: text.historyYesterday,
        }),
      });
      const items = dayEl.createDiv({
        cls: 'advancedNoteMover-history-day-items',
      });
      for (const item of day.items) {
        if (item.kind === 'row') this.renderRow(items, item.row, true);
        else this.renderGroup(items, item);
      }
    }
  }

  /** One move. Top-level rows carry the time and actions, group children don't. */
  private renderRow(
    parent: HTMLElement,
    row: HistoryRow,
    topLevel: boolean
  ): void {
    const text = strings().modals;
    const el = parent.createDiv({
      cls: `advancedNoteMover-preview-row advancedNoteMover-history-row${row.undone ? ' is-undone' : ''}`,
    });
    iconSpan(el, 'file-text', 'advancedNoteMover-faint');
    const info = el.createDiv({
      cls: `advancedNoteMover-history-info advancedNoteMover-grow`,
    });
    info.createSpan({ cls: `advancedNoteMover-history-name`, text: row.name });
    const path = (topLevel ? info : el).createSpan({
      cls: 'advancedNoteMover-path',
    });
    path.createSpan({ text: row.from });
    iconSpan(path, 'arrow-right', 'advancedNoteMover-path-icon');
    path.createEl('b', { text: row.to });
    if (topLevel) {
      // Phone: the time follows the path instead of sitting at the right.
      info.createSpan({
        cls: 'advancedNoteMover-history-when',
        text: ` · ${row.time}`,
      });
    }
    el.createSpan({
      cls: 'advancedNoteMover-pill is-neutral',
      text: row.rule ?? text.historyMovedByCommand,
    });
    if (row.undone) {
      el.createSpan({
        cls: 'advancedNoteMover-pill is-accent',
        text: text.historyUndone,
      });
    }
    if (!topLevel) return;
    el.createSpan({ cls: `advancedNoteMover-history-time`, text: row.time });
    const actions = el.createDiv({ cls: `advancedNoteMover-history-actions` });
    if (row.undone) return;
    this.renderAction(actions, 'undo-2', text.historyUndoMove, row.name, () => {
      void this.undoRow(row);
    });
    this.renderAction(
      actions,
      'external-link',
      text.historyOpenNote,
      row.name,
      () => {
        this.openRow(row);
      }
    );
  }

  private renderAction(
    parent: HTMLElement,
    icon: string,
    label: string,
    name: string,
    onClick: () => void
  ): void {
    const notices = strings().notices;
    const button = parent.createEl('button', {
      cls: 'clickable-icon advancedNoteMover-icon-button',
      attr: { type: 'button' },
    });
    iconSpan(button, icon);
    button.setAttribute(
      'aria-label',
      fill(icon === 'undo-2' ? notices.undoMoveFor : notices.openFile, {
        fileName: name,
      })
    );
    setTooltip(button, label);
    button.addEventListener('click', onClick);
  }

  private renderGroup(parent: HTMLElement, group: HistoryGroupItem): void {
    const text = strings().modals;
    const box = parent.createDiv({ cls: 'advancedNoteMover-preview-group' });
    const head = box.createDiv({ cls: 'advancedNoteMover-preview-group-head' });
    const open = !this.collapsed.has(group.id);
    const toggle = head.createEl('button', {
      cls: 'clickable-icon advancedNoteMover-icon-button',
      attr: { type: 'button' },
    });
    iconSpan(toggle, open ? 'chevron-down' : 'chevron-right');
    setAttrs(toggle, {
      'aria-expanded': String(open),
      'aria-label': fill(text.historyTogether, {
        notes: plural(group.rows.length, 'note'),
      }),
    });
    toggle.addEventListener('click', () => {
      if (open) this.collapsed.add(group.id);
      else this.collapsed.delete(group.id);
      this.renderList();
    });
    head.createSpan({
      cls: 'advancedNoteMover-strong',
      text: fill(text.historyTogether, {
        notes: plural(group.rows.length, 'note'),
      }),
    });
    const kind =
      group.operation === 'periodic'
        ? text.historySchedule
        : text.historyMoveAll;
    head.createSpan({ cls: 'advancedNoteMover-pill is-neutral', text: kind });
    head.createSpan({
      cls: 'advancedNoteMover-history-group-desc',
      text: `${kind} · ${group.time}`,
    });
    head.createSpan({ cls: 'advancedNoteMover-grow' });
    head.createSpan({
      cls: `advancedNoteMover-history-time`,
      text: group.time,
    });
    if (group.allUndone) {
      head.createSpan({
        cls: 'advancedNoteMover-pill is-accent',
        text: text.historyUndone,
      });
    } else {
      const undoAll = head.createEl('button', {
        cls: 'advancedNoteMover-undo-all-button advancedNoteMover-phone-hidden',
        attr: { type: 'button' },
      });
      iconSpan(undoAll, 'undo-2');
      undoAll.createSpan({ text: text.historyUndoAll });
      undoAll.addEventListener('click', () => {
        void this.undoGroup(group);
      });
    }
    if (!open) return;
    const body = box.createDiv({ cls: 'advancedNoteMover-preview-group-body' });
    for (const row of group.rows) this.renderRow(body, row, false);
    if (!group.allUndone) {
      // Phone: the head is a plain row, so Undo all moves to the end of the group.
      const undoRow = body.createEl('button', {
        cls: 'advancedNoteMover-history-undo-all',
        text: text.historyUndoAll,
        attr: { type: 'button' },
      });
      undoRow.addEventListener('click', () => {
        void this.undoGroup(group);
      });
    }
  }

  private renderFooter(): void {
    const text = strings().modals;
    const footer = renderModalFooter(this.contentEl, {
      primaryText: text.historySettings,
      plain: true,
      onPrimary: () => {
        this.close();
        this.plugin.openSettingsPage('main', 'history');
      },
    });
    const days = this.retentionDays();
    footer.leftEl.createSpan({
      cls: 'advancedNoteMover-footer-status',
      text:
        days === null
          ? text.historyKeptForever
          : fill(text.historyRemovedAfter, {
              period: retentionDaysLabel(days),
            }),
    });
  }

  private openRow(row: HistoryRow): void {
    const entry = this.entries.get(row.id);
    const file = entry && this.fileFor(entry);
    if (!entry || !file) {
      NoticeManager.error(
        fill(strings().notices.couldNotFindFile, { fileName: row.name }),
        { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
      );
      return;
    }
    void this.app.workspace.getLeaf().openFile(file);
    this.close();
  }

  private fileFor(entry: HistoryEntry): TFile | null {
    for (const path of [entry.destinationPath, entry.sourcePath]) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) return file;
    }
    return null;
  }

  private async undoRow(row: HistoryRow): Promise<void> {
    if (await this.historyManager.undoEntry(row.id)) {
      this.refresh();
      return;
    }
    NoticeManager.error(
      fill(strings().notices.couldNotUndoMove, { fileName: row.name }),
      { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
    );
  }

  private async undoGroup(group: HistoryGroupItem): Promise<void> {
    const result = await this.historyManager.undoBulkOperation(group.id);
    if (!result.success) {
      NoticeManager.error(result.errors.join('; '), {
        duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE,
      });
    }
    this.refresh();
  }

  /** Re-reads the history after an undo, keeping the toolbar and filters. */
  private refresh(): void {
    this.loadEntries();
    if (MobileUtils.isPhone()) {
      // Phone: bulk operations start closed, like navigation rows.
      for (const bulk of this.historyManager.getBulkOperations()) {
        this.collapsed.add(bulk.id);
      }
    }
    this.subEl?.setText(this.subtitle());
    this.renderList();
  }
}
