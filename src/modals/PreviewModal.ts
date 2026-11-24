import { App, Menu, TFile } from 'obsidian';
import AdvancedNoteMoverPlugin from 'main';
import { fill, plural, strings } from '../i18n/locale';
import { MovePreview, PreviewEntry } from '../types/MovePreview';
import { NoticeManager } from '../utils/NoticeManager';
import { viewIdle } from '../utils/viewTimers';
import {
  combinePath,
  ensureFolderExists,
  folderExists,
  getParentPath,
} from '../utils/PathUtils';
import { createError } from '../utils/Error';
import {
  formatMoveSkippedDetail,
  isNoteMoveConflictSkipOutcome,
} from '../application/note-move-skip-outcome';
import { executeNoteMoveWithConflictHandling } from '../application/execute-note-move-with-conflict';
import {
  previewEntryDetails,
  type PreviewEntryDetails,
} from '../application/preview-entry-details';
import { getAttachmentMoveSettings } from '../utils/attachment-settings';
import type { ConflictRun } from '../types/ConflictResolution';
import { deriveConflictInteractive } from '../utils/conflict-resolution-settings';
import {
  checkState,
  groupMoves,
  groupStays,
  matchesQuery,
  noteName,
  stayCategory,
  type StayCategory,
} from '../domain/preview/previewGroups';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { iconSpan, setAttrs } from './modalDom';
import { renderModalFooter, type ModalFooter } from './modalFooter';
import { pickNoteForWhyNot, openWhyNotMovedForFile } from './WhyNotMovedModal';
import { countNoteMoveConflicts } from '../application/resolve-note-move-conflict';

type PreviewLoader = (
  signal: AbortSignal,
  onProgress: (completed: number, total: number, found: number) => void
) => Promise<MovePreview>;

type Tab = 'move' | 'stay';

const EMPTY_PREVIEW: MovePreview = {
  successfulMoves: [],
  analyzed: [],
  totalFiles: 0,
  settings: { isFilterWhitelist: false },
};

const NO_DETAILS: PreviewEntryDetails = {
  conflict: false,
  attachments: 0,
  newFolder: false,
};

function countOf(count: number, noun: string): string {
  return plural(count, noun).replace(String(count), count.toLocaleString());
}

function setPlain(el: HTMLElement | null | undefined, text: string): void {
  if (el) el.textContent = text;
}

/** The one move preview: loading, nothing to move, and the checked list. */
export class PreviewModal extends BaseModal {
  private movePreview: MovePreview;
  private previewReady: boolean;
  private readonly loadPreview: PreviewLoader | undefined;
  private operationAbort: AbortController | null = null;
  private readonly selectedPaths = new Set<string>();
  private readonly renamePaths = new Set<string>();
  private readonly details = new Map<string, PreviewEntryDetails>();
  private tab: Tab = 'move';
  private query = '';

  private footer: ModalFooter | null = null;
  private listEl: HTMLElement | null = null;
  private tabsEl: HTMLElement | null = null;
  private busy = false;
  private progress: {
    bar: HTMLElement;
    barWrap: HTMLElement;
    sub: HTMLElement;
    done: HTMLElement;
    found: HTMLElement;
  } | null = null;

  constructor(
    app: App,
    private plugin: AdvancedNoteMoverPlugin,
    movePreview: MovePreview | null,
    options: BaseModalOptions & { load?: PreviewLoader } = {}
  ) {
    const { load, ...modalOptions } = options;
    super(app, {
      title: strings().modals.previewTitle,
      cssClass: 'advancedNoteMover-preview-modal',
      phoneFullscreen: true,
      ...modalOptions,
    });
    this.loadPreview = load;
    this.previewReady = movePreview != null;
    this.movePreview = movePreview ?? EMPTY_PREVIEW;
    this.prepare();
  }

  /** Reads the vault once per entry; conflicting notes start unchecked. */
  private prepare(): void {
    this.selectedPaths.clear();
    this.renamePaths.clear();
    this.details.clear();
    const settings = this.plugin.pluginData?.settings;
    for (const entry of this.movePreview.successfulMoves) {
      // shortcut: attachment scan runs per entry on open, cache it if huge vaults feel slow.
      const detail = settings
        ? previewEntryDetails(this.app, settings, entry)
        : NO_DETAILS;
      this.details.set(entry.currentPath, detail);
      if (!detail.conflict) {
        this.selectedPaths.add(entry.currentPath);
      }
    }
  }

  private detailsOf(entry: PreviewEntry): PreviewEntryDetails {
    return this.details.get(entry.currentPath) ?? NO_DETAILS;
  }

  private beginOperation(): AbortController {
    this.operationAbort?.abort();
    const controller = new AbortController();
    this.operationAbort = controller;
    return controller;
  }

  onClose(): void {
    this.operationAbort?.abort();
    super.onClose();
  }

  private selectedEntries(): PreviewEntry[] {
    return this.movePreview.successfulMoves.filter(entry =>
      this.selectedPaths.has(entry.currentPath)
    );
  }

  private ruleCount(): number {
    const rules = this.plugin.pluginData?.settings?.rulesV2 ?? [];
    return rules.filter(rule => rule.active).length;
  }

  private isSingleNote(): boolean {
    return !this.loadPreview && this.movePreview.analyzed.length === 1;
  }

  private setWidth(wide: boolean): void {
    this.modalEl.classList.toggle('advancedNoteMover-preview-wide', wide);
    this.modalEl.classList.toggle('advancedNoteMover-preview-narrow', !wide);
  }

  private subtitle(text: string): HTMLElement {
    return this.contentEl.createEl('p', {
      cls: 'advancedNoteMover-modal-sub',
      text,
    });
  }

  protected createContent(): void {
    if (this.loadPreview && !this.previewReady) {
      this.renderLoading();
      return;
    }
    this.renderResult();
  }

  // ---- loading -----------------------------------------------------------

  private renderLoading(): void {
    const { contentEl } = this;
    const text = strings().modals;
    this.setWidth(false);
    const sub = this.subtitle(
      fill(text.previewSubtitleLoadingStart, {
        rules: plural(this.ruleCount(), 'rule'),
      })
    );
    const barWrap = contentEl.createDiv({
      cls: 'advancedNoteMover-preview-progress',
    });
    setAttrs(barWrap, {
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '0',
      'aria-label': text.previewChecking,
    });
    const bar = barWrap.createDiv();
    const meta = contentEl.createDiv({ cls: 'advancedNoteMover-preview-meta' });
    const done = meta.createSpan();
    meta.createSpan({ cls: 'advancedNoteMover-grow' });
    const found = meta.createSpan();
    found.setAttribute('aria-live', 'polite');
    const skeleton = contentEl.createDiv({
      cls: 'advancedNoteMover-preview-skeleton',
    });
    skeleton.ariaHidden = 'true';
    for (let i = 0; i < 3; i++) skeleton.createDiv();
    this.progress = { bar, barWrap, sub, done, found };
    this.updateProgress(0, 0, 0);

    const footer = renderModalFooter(contentEl, {
      primaryText: text.previewMoveNotes,
      primaryDisabled: true,
      onPrimary: () => {},
      cancelText: strings().common.cancel,
      onCancel: () => {
        this.close();
      },
    });
    footer.leftEl.createSpan({
      cls: 'advancedNoteMover-footer-status',
      text: text.previewNothingMoves,
    });

    const signal = this.beginOperation().signal;
    void this.loadPreview?.(signal, (completed, total, foundCount) => {
      if (!signal.aborted) this.updateProgress(completed, total, foundCount);
    })
      .then(preview => {
        if (signal.aborted) return;
        this.movePreview = preview;
        this.previewReady = true;
        this.prepare();
        this.progress = null;
        this.contentEl.empty();
        this.createContent();
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        NoticeManager.error(
          fill(strings().notices.errorGeneratingPreview, { message })
        );
      });
  }

  private updateProgress(done: number, total: number, found: number): void {
    const view = this.progress;
    if (!view) return;
    const text = strings().modals;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    view.barWrap.setAttribute('aria-valuenow', String(percent));
    view.bar.setCssProps({ width: `${percent}%` });
    if (total > 0) {
      setPlain(
        view.sub,
        fill(text.previewSubtitleLoading, {
          notes: countOf(total, 'note'),
          rules: plural(this.ruleCount(), 'rule'),
        })
      );
    }
    setPlain(
      view.done,
      fill(text.previewProgress, {
        done: done.toLocaleString(),
        total: total.toLocaleString(),
      })
    );
    setPlain(view.found, fill(text.previewFound, { count: found }));
  }

  // ---- result ------------------------------------------------------------

  private renderResult(): void {
    const { contentEl } = this;
    const stats = this.movePreview;
    const single = this.isSingleNote();
    this.subtitle(
      single
        ? noteName(stats.analyzed[0].fileName)
        : fill(strings().modals.previewSubtitle, {
            notes: countOf(stats.totalFiles, 'note'),
            rules: plural(this.ruleCount(), 'rule'),
          })
    );

    if (stats.successfulMoves.length === 0) {
      this.renderNothingToMove(single);
      return;
    }
    this.setWidth(true);
    this.renderToolbar(contentEl);
    this.listEl = contentEl.createDiv({
      cls: 'advancedNoteMover-preview-scroll',
    });
    this.renderList();
    this.renderFooter();
  }

  private renderToolbar(parent: HTMLElement): void {
    const text = strings().modals;
    const row = parent.createDiv({ cls: 'advancedNoteMover-preview-toolbar' });
    const field = row.createDiv({ cls: 'advancedNoteMover-search-field' });
    iconSpan(field, 'search');
    const input = field.createEl('input', { type: 'search' });
    setAttrs(input, {
      placeholder: text.previewSearch,
      'aria-label': text.previewSearch,
    });
    input.addEventListener('input', () => {
      this.query = input.value;
      this.renderList();
    });

    const tabs = row.createDiv({ cls: 'advancedNoteMover-segmented' });
    setAttrs(tabs, { role: 'tablist', 'aria-label': text.previewTabsLabel });
    this.tabsEl = tabs;
    const stays = this.stayEntries().length;
    const tabSpecs: [Tab, string, number][] = [
      ['move', text.previewTabMove, this.movePreview.successfulMoves.length],
      ['stay', text.previewTabStay, stays],
    ];
    for (const [id, label, count] of tabSpecs) {
      const button = tabs.createEl('button', { text: `${label} ` });
      setAttrs(button, { role: 'tab', type: 'button' });
      button.dataset.tab = id;
      button.createSpan({
        cls: 'advancedNoteMover-badge',
        text: String(count),
      });
      button.addEventListener('click', () => {
        this.showTab(id);
      });
    }
    this.syncTabs();
  }

  private syncTabs(): void {
    this.tabsEl?.querySelectorAll('button').forEach(button => {
      const active = button.dataset.tab === this.tab;
      button.setAttribute('aria-selected', String(active));
      button.setAttribute('tabindex', active ? '0' : '-1');
      button.classList.toggle('is-active', active);
    });
  }

  private showTab(tab: Tab): void {
    this.tab = tab;
    this.syncTabs();
    this.renderList();
  }

  private stayEntries(): PreviewEntry[] {
    return this.movePreview.analyzed.filter(entry => !entry.willBeMoved);
  }

  private renderList(): void {
    const list = this.listEl;
    if (!list) return;
    list.empty();
    if (this.tab === 'move') {
      this.renderMoveGroups(list);
    } else {
      this.renderStayGroups(list);
    }
  }

  private renderMoveGroups(list: HTMLElement): void {
    const text = strings().modals;
    const entries = this.movePreview.successfulMoves.filter(entry =>
      matchesQuery(entry, this.query)
    );
    for (const group of groupMoves(entries)) {
      const box = list.createDiv({ cls: 'advancedNoteMover-preview-group' });
      const head = box.createDiv({
        cls: 'advancedNoteMover-preview-group-head',
      });
      const rule = group.rule || strings().unnamedRule;
      const groupBox = this.createCheckbox(
        head,
        fill(text.previewGroupSelect, { rule }),
        () => this.groupState(group.entries),
        checked => {
          for (const entry of group.entries) {
            if (checked) this.selectedPaths.add(entry.currentPath);
            else this.selectedPaths.delete(entry.currentPath);
          }
          this.renderList();
          this.syncFooter();
        }
      );
      void groupBox;
      head.createSpan({ cls: 'advancedNoteMover-strong', text: rule });
      iconSpan(head, 'arrow-right', 'advancedNoteMover-faint');
      this.renderPath(head, group.destination);
      if (this.detailsOf(group.entries[0]).newFolder) {
        head.createSpan({
          cls: 'advancedNoteMover-pill is-neutral',
          text: text.previewNewFolder,
        });
      }
      head.createSpan({ cls: 'advancedNoteMover-grow' });
      head.createSpan({
        cls: 'advancedNoteMover-badge',
        text: String(group.entries.length),
      });
      const body = box.createDiv({
        cls: 'advancedNoteMover-preview-group-body',
      });
      for (const entry of group.entries) this.renderMoveRow(body, entry);
    }
    if (entries.length === 0) {
      list.createDiv({
        cls: 'advancedNoteMover-preview-no-results',
        text: text.previewNoResults,
      });
    }
  }

  private groupState(entries: readonly PreviewEntry[]) {
    return checkState(
      entries.filter(entry => this.selectedPaths.has(entry.currentPath)).length,
      entries.length
    );
  }

  private renderPath(parent: HTMLElement, folder: string): void {
    const path = parent.createSpan({ cls: 'advancedNoteMover-path' });
    iconSpan(path, 'folder', 'advancedNoteMover-path-icon');
    path.createEl('b', { text: folder || strings().modals.previewVaultRoot });
  }

  private createCheckbox(
    parent: HTMLElement,
    label: string,
    state: () => 'checked' | 'mixed' | 'unchecked',
    onToggle: (checked: boolean) => void
  ): HTMLInputElement {
    const hit = parent.createEl('label', { cls: 'advancedNoteMover-cb-hit' });
    const box = hit.createEl('input', { type: 'checkbox' });
    box.setAttribute('aria-label', label);
    const current = state();
    box.checked = current === 'checked';
    box.indeterminate = current === 'mixed';
    box.addEventListener('change', () => {
      onToggle(box.checked);
    });
    return box;
  }

  private renderMoveRow(body: HTMLElement, entry: PreviewEntry): void {
    const text = strings().modals;
    const detail = this.detailsOf(entry);
    const row = body.createDiv({ cls: 'advancedNoteMover-preview-row' });
    this.createCheckbox(
      row,
      fill(text.previewRowSelect, { fileName: noteName(entry.fileName) }),
      () =>
        this.selectedPaths.has(entry.currentPath) ? 'checked' : 'unchecked',
      checked => {
        if (checked) this.selectedPaths.add(entry.currentPath);
        else this.selectedPaths.delete(entry.currentPath);
        this.renderList();
        this.syncFooter();
      }
    );
    row.createSpan({
      cls: 'advancedNoteMover-row-name',
      text: noteName(entry.fileName),
    });
    this.renderRowDesc(row, entry);
    if (detail.attachments > 0) {
      const pill = row.createSpan({ cls: 'advancedNoteMover-pill is-neutral' });
      iconSpan(pill, 'file');
      pill.createSpan({ text: `+${plural(detail.attachments, 'attachment')}` });
    }
    const renamed = this.renamePaths.has(entry.currentPath);
    if (detail.conflict && !renamed) {
      const pill = row.createSpan({ cls: 'advancedNoteMover-pill is-warning' });
      iconSpan(pill, 'alert-triangle');
      pill.createSpan({ text: text.previewConflictPill });
    } else if (renamed) {
      row.createSpan({
        cls: 'advancedNoteMover-pill is-neutral',
        text: text.previewWillRename,
      });
    }
    row.createSpan({ cls: 'advancedNoteMover-grow' });
    if (detail.conflict && !renamed) {
      const keep = row.createEl('button', {
        cls: 'advancedNoteMover-quiet-button',
        text: text.previewKeepBoth,
        attr: { type: 'button' },
      });
      keep.addEventListener('click', () => {
        this.renamePaths.add(entry.currentPath);
        this.selectedPaths.add(entry.currentPath);
        this.renderList();
        this.syncFooter();
      });
    }
    row.createSpan({
      cls: 'advancedNoteMover-row-meta',
      text: this.fromText(entry),
    });
    if (detail.conflict && !renamed) this.renderConflictMenu(row, entry);
  }

  /** Phone: the line under the name replaces the pills and the right-hand text. */
  private renderRowDesc(row: HTMLElement, entry: PreviewEntry): void {
    const text = strings().modals;
    const detail = this.detailsOf(entry);
    const desc = row.createDiv({ cls: 'advancedNoteMover-row-desc' });
    const parts: { text: string; cls?: string }[] = [];
    if (this.renamePaths.has(entry.currentPath)) {
      parts.push({ text: text.previewWillRename });
    } else if (detail.conflict) {
      parts.push({
        text: text.previewConflictPill,
        cls: 'advancedNoteMover-warning-text',
      });
    }
    parts.push({ text: this.fromText(entry) });
    if (detail.attachments > 0) {
      parts.push({ text: `+${plural(detail.attachments, 'attachment')}` });
    }
    parts.forEach((part, index) => {
      if (index > 0) desc.appendText(' · ');
      desc.createSpan({ cls: part.cls, text: part.text });
    });
  }

  /** Phone: the chevron on a conflict row opens the way to resolve it. */
  private renderConflictMenu(row: HTMLElement, entry: PreviewEntry): void {
    const button = row.createEl('button', {
      cls: 'clickable-icon advancedNoteMover-row-chevron',
      attr: {
        type: 'button',
        'aria-label': strings().modals.previewConflictPill,
        'aria-haspopup': 'menu',
      },
    });
    iconSpan(button, 'chevron-right');
    button.addEventListener('click', () => {
      const rect = button.getBoundingClientRect();
      const menu = new Menu();
      menu.addItem(item =>
        item
          .setTitle(strings().modals.previewKeepBoth)
          .setIcon('copy')
          .onClick(() => {
            this.renamePaths.add(entry.currentPath);
            this.selectedPaths.add(entry.currentPath);
            this.renderList();
            this.syncFooter();
          })
      );
      menu.showAtPosition({ x: rect.right, y: rect.bottom });
    });
  }

  private fromText(entry: PreviewEntry): string {
    const folder = getParentPath(entry.currentPath);
    return folder
      ? fill(strings().modals.previewFrom, { folder })
      : strings().modals.previewFromRoot;
  }

  private renderStayGroups(list: HTMLElement): void {
    const text = strings().modals;
    const labels: Record<StayCategory, string> = {
      no_rule: text.previewGroupNoRule,
      already_there: text.previewGroupAlready,
      excluded: text.previewGroupExcluded,
      other: text.previewGroupOther,
    };
    const entries = this.stayEntries().filter(entry =>
      matchesQuery(entry, this.query)
    );
    for (const group of groupStays(entries)) {
      const box = list.createDiv({ cls: 'advancedNoteMover-preview-group' });
      const head = box.createDiv({
        cls: 'advancedNoteMover-preview-group-head',
      });
      head.createSpan({
        cls: 'advancedNoteMover-strong',
        text: labels[group.category],
      });
      head.createSpan({ cls: 'advancedNoteMover-grow' });
      head.createSpan({
        cls: 'advancedNoteMover-badge',
        text: String(group.entries.length),
      });
      const body = box.createDiv({
        cls: 'advancedNoteMover-preview-group-body',
      });
      for (const entry of group.entries) {
        const row = body.createDiv({
          cls: 'advancedNoteMover-preview-row is-stay',
        });
        row.createSpan({
          cls: 'advancedNoteMover-row-name',
          text: noteName(entry.fileName),
        });
        row.createSpan({ cls: 'advancedNoteMover-grow' });
        row.createSpan({
          cls: 'advancedNoteMover-row-meta',
          text: this.stayReason(entry),
        });
      }
    }
    if (entries.length === 0) {
      list.createDiv({
        cls: 'advancedNoteMover-preview-no-results',
        text: text.previewNoResults,
      });
    }
  }

  /** The row's own reason, shown right-aligned in the Stays tab. */
  private stayReason(entry: PreviewEntry): string {
    switch (stayCategory(entry)) {
      case 'no_rule':
        return this.fromText(entry);
      case 'already_there':
        return entry.matchedRule ?? this.fromText(entry);
      case 'excluded':
        return entry.blockingFilter ?? this.fromText(entry);
      default:
        return entry.blockReason ?? this.fromText(entry);
    }
  }

  // ---- footer ------------------------------------------------------------

  private renderFooter(): void {
    const text = strings().modals;
    const count = this.selectedEntries().length;
    this.footer = renderModalFooter(this.contentEl, {
      primaryText: this.moveLabel(count),
      primaryDisabled: count === 0,
      onPrimary: () => {
        void this.executeMoves();
      },
      cancelText: strings().common.cancel,
      onCancel: () => {
        if (this.busy) this.operationAbort?.abort();
        else this.close();
      },
    });
    this.footer.leftEl.createSpan({
      cls: 'advancedNoteMover-footer-status',
    });
    // Phone: the close button covers Cancel until the moves start.
    this.footer.leftEl.parentElement?.addClass('is-close-only');
    void text;
    this.syncFooter();
  }

  private moveLabel(count: number): string {
    return fill(strings().modals.previewMoveFiles, {
      files: plural(count, 'note'),
    });
  }

  private syncFooter(): void {
    const footer = this.footer;
    if (!footer || this.busy) return;
    const text = strings().modals;
    const selected = this.selectedEntries();
    const attachments = selected.reduce(
      (sum, entry) => sum + this.detailsOf(entry).attachments,
      0
    );
    const params = {
      selected: selected.length,
      total: this.movePreview.successfulMoves.length,
    };
    setPlain(
      footer.leftEl.querySelector<HTMLElement>(
        '.advancedNoteMover-footer-status'
      ),
      attachments > 0
        ? fill(text.previewSelectedAttachments, {
            ...params,
            attachments: plural(attachments, 'attachment'),
          })
        : fill(text.previewSelected, params)
    );
    footer.primary.setButtonText(this.moveLabel(selected.length));
    footer.primary.setDisabled(selected.length === 0);
  }

  // ---- nothing to move ---------------------------------------------------

  private renderNothingToMove(single: boolean): void {
    const text = strings().modals;
    const { contentEl } = this;
    this.setWidth(false);
    const box = contentEl.createDiv({ cls: 'advancedNoteMover-preview-empty' });
    iconSpan(box, 'minus-circle', 'advancedNoteMover-preview-empty-icon');
    const body = box.createDiv();
    const entry = this.movePreview.analyzed[0];
    let showWhy: (() => void) | null = null;

    if (single && entry) {
      const folder = getParentPath(entry.currentPath) || text.previewVaultRoot;
      body.createDiv({
        cls: 'advancedNoteMover-strong',
        text: fill(text.previewStaysIn, {
          note: noteName(entry.fileName),
          folder,
        }),
      });
      body.createDiv({
        cls: 'advancedNoteMover-preview-empty-text',
        text: this.whyStays(entry),
      });
      const file = this.app.vault.getAbstractFileByPath(entry.currentPath);
      if (file instanceof TFile) {
        showWhy = () => {
          openWhyNotMovedForFile(this.plugin, file);
        };
      }
    } else {
      body.createDiv({
        cls: 'advancedNoteMover-strong',
        text: text.previewNothingTitle,
      });
      body.createDiv({
        cls: 'advancedNoteMover-preview-empty-text',
        text:
          this.movePreview.totalFiles === 0
            ? text.previewNoNotes
            : fill(text.previewNothingBody, {
                notes: countOf(this.movePreview.totalFiles, 'note'),
                rules: plural(this.ruleCount(), 'rule'),
              }),
      });
      showWhy = () => {
        pickNoteForWhyNot(this.plugin);
      };
    }
    if (showWhy) {
      const link = body.createEl('button', {
        cls: 'advancedNoteMover-link-button',
        text: text.previewShowWhy,
        attr: { type: 'button' },
      });
      link.addEventListener('click', showWhy);
    }

    const footer = renderModalFooter(contentEl, {
      primaryText: strings().common.close,
      onPrimary: () => {
        this.close();
      },
    });
    const file = entry
      ? this.app.vault.getAbstractFileByPath(entry.currentPath)
      : null;
    const left = footer.leftEl.createEl('button', {
      cls: 'mod-button',
      text: single ? text.previewNewRule : text.previewOpenRules,
      attr: { type: 'button' },
    });
    left.addEventListener('click', () => {
      if (single && file instanceof TFile) {
        this.close();
        this.plugin.advancedNoteMover.openNewRuleFromNote(file);
      } else {
        this.openRules();
      }
    });
  }

  private whyStays(entry: PreviewEntry): string {
    const text = strings().modals;
    switch (stayCategory(entry)) {
      case 'no_rule':
        return text.previewWhyNoRule;
      case 'already_there':
        return text.previewWhyAlready;
      case 'excluded':
        return text.previewWhyExcluded;
      default:
        return fill(text.previewWhyOther, { reason: entry.blockReason ?? '' });
    }
  }

  private openRules(): void {
    this.close();
    const setting = (
      this.app as App & {
        setting?: {
          open: () => void;
          openTabById: (id: string) => void;
        };
      }
    ).setting;
    // shortcut: Obsidian has no public API for opening a plugin settings tab.
    if (!setting) {
      return;
    }
    setting.open();
    setting.openTabById('note-mover-shortcut');
  }

  // ---- moving ------------------------------------------------------------

  /** "Keep both" moves one note with the rename strategy instead of the saved default. */
  private settingsFor(entry: PreviewEntry) {
    const settings = this.plugin.pluginData.settings;
    if (!this.renamePaths.has(entry.currentPath)) return settings;
    return {
      ...settings,
      conflictResolution: {
        ...settings.conflictResolution,
        strategy: 'rename',
      },
    } as typeof settings;
  }

  private async executeMoves() {
    const successfulEntries = this.selectedEntries();
    if (successfulEntries.length === 0) {
      return;
    }
    let movedCount = 0;
    let errorCount = 0;
    let missingFolderSkippedCount = 0;
    let conflictSkippedCount = 0;
    const moveErrors: string[] = [];
    const controller = this.beginOperation();
    const signal = controller.signal;
    let status: HTMLElement | null = null;

    if (this.footer) {
      this.busy = true;
      this.footer.primary.setDisabled(true);
      this.footer.leftEl.parentElement?.removeClass('is-close-only');
      this.footer.cancel?.setButtonText(strings().modals.previewStop);
      status =
        this.footer.leftEl.querySelector<HTMLElement>(
          '.advancedNoteMover-footer-status'
        ) ?? null;
      status?.setAttribute('aria-live', 'polite');
      setPlain(
        status,
        fill(strings().modals.previewMoving, {
          count: successfulEntries.length,
        })
      );
      this.footer.cancel?.onClick(() => {
        controller.abort();
        setPlain(status, strings().modals.previewStopping);
      });
    }

    const conflictRun: ConflictRun = {
      remaining: await countNoteMoveConflicts(
        this.app,
        successfulEntries
          .filter(
            entry =>
              entry.targetPath && !this.renamePaths.has(entry.currentPath)
          )
          .map(entry => ({
            sourcePath: entry.currentPath,
            newPath: combinePath(entry.targetPath ?? '', entry.fileName),
          }))
      ),
      sticky: null,
    };
    this.plugin.historyManager.startBulkOperation('bulk');

    try {
      for (let i = 0; i < successfulEntries.length; i++) {
        const entry = successfulEntries[i];
        if (signal.aborted) {
          break;
        }
        setPlain(
          status,
          fill(strings().modals.previewMoveProgress, {
            done: i + 1,
            total: successfulEntries.length,
          })
        );
        try {
          const file = this.app.vault.getAbstractFileByPath(entry.currentPath);
          if (!(file instanceof TFile) || !entry.targetPath) continue;

          const targetFolder = entry.targetPath;
          const newPath = combinePath(targetFolder, file.name);
          if (file.path === newPath) continue;

          // Respect the folder-creation decision: skip if auto-create is
          // disabled and the destination folder is missing (e.g. it was
          // deleted between preview generation and execution).
          if (
            entry.createFolder === false &&
            !(await folderExists(this.app, targetFolder))
          ) {
            missingFolderSkippedCount++;
            continue;
          }

          if (!(await ensureFolderExists(this.app, targetFolder))) {
            throw createError(
              `Failed to create target folder: ${targetFolder}`
            );
          }

          const moveOutcome = await executeNoteMoveWithConflictHandling({
            app: this.app,
            settings: this.settingsFor(entry),
            historyManager: this.plugin.historyManager,
            conflictSkipCache: this.plugin.conflictSkipCacheManager,
            file,
            originalPath: entry.currentPath,
            targetFolder,
            attachmentSettings: getAttachmentMoveSettings(
              this.plugin.pluginData.settings
            ),
            interactive: deriveConflictInteractive(
              this.plugin.pluginData.settings,
              false
            ),
            bypassConflictSkipCache: true,
            ruleName: entry.matchedRule,
            conflictRun,
          });

          if (moveOutcome.moved) {
            movedCount++;
          } else if (isNoteMoveConflictSkipOutcome(moveOutcome)) {
            conflictSkippedCount++;
          }
        } catch (error) {
          errorCount++;
          const message =
            error instanceof Error ? error.message : String(error);
          moveErrors.push(`${entry.fileName}: ${message}`);
        }
        if ((i + 1) % 50 === 0 && i + 1 < successfulEntries.length) {
          await new Promise<void>(resolve => {
            viewIdle(resolve, 250);
          });
        }
      }
    } finally {
      this.plugin.historyManager.endBulkOperation();
    }

    const stopped = signal.aborted;
    this.close();

    const skippedDetail = formatMoveSkippedDetail({
      missingFolder: missingFolderSkippedCount,
      conflict: conflictSkippedCount,
    });
    const totalSkipped = missingFolderSkippedCount + conflictSkippedCount;

    if (stopped) {
      NoticeManager.info(
        fill(strings().modals.previewStopped, {
          moved: plural(movedCount, 'file'),
          errors: plural(errorCount, 'error'),
          skipped: skippedDetail,
        })
      );
    } else if (errorCount === 0 && totalSkipped === 0) {
      NoticeManager.success(
        fill(strings().modals.previewSuccess, {
          moved: plural(movedCount, 'file'),
        })
      );
    } else if (errorCount === 0) {
      NoticeManager.info(
        fill(strings().modals.previewMoved, {
          moved: plural(movedCount, 'file'),
          skipped: skippedDetail,
        })
      );
    } else {
      NoticeManager.warning(
        fill(strings().modals.previewMovedWithErrors, {
          moved: plural(movedCount, 'file'),
          errors: plural(errorCount, 'error'),
          skipped: skippedDetail,
        }),
        {
          detailText: strings().common.showDetails,
          onDetail: () => {
            NoticeManager.error(moveErrors.join('; '));
          },
        }
      );
    }
  }
}
