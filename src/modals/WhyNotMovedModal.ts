import { ButtonComponent, FuzzySuggestModal, TFile, setIcon } from 'obsidian';
import type AdvancedNoteMoverPlugin from 'main';
import {
  explainNote,
  type ConditionExplanation,
  type ConditionReason,
  type NoteExplanation,
  type RuleExplanation,
} from '../domain/rules/v2/ruleTester';
import type { ExclusionKind } from '../domain/filters/exclusionFilter';
import { fileMetadataFromCache } from './rule-editor/ruleLivePreview';
import { operatorLabel } from '../domain/rules/operatorLabel';
import { fill, strings } from '../i18n/locale';
import { getParentPath } from '../utils/PathUtils';
import { BaseModal } from './BaseModal';
import { renderModalFooter } from './modalFooter';

function explain(
  plugin: AdvancedNoteMoverPlugin,
  file: TFile
): NoteExplanation {
  const settings = plugin.pluginData.settings;
  return explainNote(
    fileMetadataFromCache(file, plugin.app.metadataCache.getFileCache(file)),
    settings.rulesV2 ?? [],
    settings.filters.filter.map(filter => filter.value)
  );
}

function reasonText(reason: ConditionReason): string {
  const copy = strings().whyNotFragments;
  switch (reason.code) {
    case 'matches':
      return copy.reasonMatches;
    case 'hasTag':
      return fill(copy.reasonHasTag, { tag: reason.value });
    case 'noTags':
      return copy.reasonNoTags;
    case 'propertyMissing':
      return copy.reasonPropertyMissing;
    case 'propertyIs':
      return fill(copy.reasonPropertyIs, { value: reason.value });
    default:
      return copy.reasonDiffers;
  }
}

function kindText(kind: ExclusionKind): string {
  const copy = strings().whyNotFragments;
  const labels: Record<ExclusionKind, string> = {
    tag: copy.kindTag,
    folder: copy.kindFolder,
    fileName: copy.kindFileName,
    property: copy.kindProperty,
    other: copy.kindOther,
  };
  return labels[kind];
}

function statusIcon(parent: HTMLElement, ok: boolean, small: boolean): void {
  const icon = parent.createSpan({
    cls: `advancedNoteMover-why-icon ${ok ? 'is-ok' : 'is-fail'}${small ? ' is-small' : ''}`,
  });
  icon.setAttribute('aria-hidden', 'true');
  setIcon(icon, ok ? 'check-circle' : 'x-circle');
}

export class WhyNotMovedModal extends BaseModal {
  private readonly explanation: NoteExplanation;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private file: TFile
  ) {
    const explanation = explain(plugin, file);
    const copy = strings().modals;
    super(plugin.app, {
      title: explanation.movesTo
        ? fill(copy.whyNotTitleMoves, {
            note: file.basename,
            folder: explanation.movesTo,
          })
        : fill(copy.whyNotTitleStays, { note: file.basename }),
      cssClass: 'advancedNoteMover-why-modal',
      size: 'medium',
    });
    this.explanation = explanation;
  }

  protected createContent(): void {
    const { contentEl, explanation } = this;
    const copy = strings().modals;

    const sub = contentEl.createEl('p', { cls: 'advancedNoteMover-modal-sub' });
    const path = sub.createSpan({ cls: 'advancedNoteMover-path' });
    setIcon(path.createSpan({ cls: 'advancedNoteMover-path-icon' }), 'folder');
    path.createSpan({
      text: getParentPath(this.file.path) || copy.previewVaultRoot,
    });

    if (explanation.excludedBy) {
      this.renderExcluded(explanation.excludedBy);
    }

    contentEl.createDiv({
      cls: 'advancedNoteMover-list-head',
      text: copy.whyNotRulesHeading,
    });
    if (explanation.rules.length === 0) {
      contentEl.createDiv({
        cls: 'advancedNoteMover-row-meta',
        text: copy.whyNotNoRules,
      });
    }
    for (const item of explanation.rules.filter(rule => rule.checked)) {
      this.renderRule(contentEl, item);
    }
    for (const item of explanation.rules.filter(rule => !rule.checked)) {
      const row = contentEl.createDiv({ cls: 'advancedNoteMover-why-off' });
      const icon = row.createSpan({ cls: 'advancedNoteMover-path-icon' });
      icon.setAttribute('aria-hidden', 'true');
      setIcon(icon, 'minus-circle');
      row.createSpan({
        text: fill(copy.whyNotRuleOff, {
          rule: item.rule.name || strings().unnamedRule,
        }),
      });
    }

    const footer = renderModalFooter(contentEl, {
      primaryText: strings().common.close,
      onPrimary: () => this.close(),
    });
    new ButtonComponent(footer.leftEl)
      .setButtonText(copy.whyNotCheckAnother)
      .setClass('advancedNoteMover-link-button')
      .onClick(() => {
        this.close();
        pickNoteForWhyNot(this.plugin);
      });
  }

  private renderExcluded(
    excluded: NonNullable<NoteExplanation['excludedBy']>
  ): void {
    const copy = strings().modals;
    const callout = this.contentEl.createDiv({
      cls: 'advancedNoteMover-callout is-warning',
    });
    const icon = callout.createDiv({ cls: 'advancedNoteMover-callout-icon' });
    icon.setAttribute('aria-hidden', 'true');
    setIcon(icon, 'alert-triangle');
    const body = callout.createDiv({ cls: 'advancedNoteMover-callout-body' });
    body.createDiv({
      cls: 'advancedNoteMover-strong',
      text: fill(copy.whyNotExcludedBy, {
        type: kindText(excluded.kind),
        value: excluded.value,
      }),
    });
    body.createDiv({
      cls: 'advancedNoteMover-row-meta',
      text: copy.whyNotExcludedNote,
    });
    new ButtonComponent(callout)
      .setButtonText(copy.whyNotEditExclusions)
      .setClass('advancedNoteMover-callout-button')
      .onClick(() => {
        this.close();
        this.plugin.openSettingsPage('main', 'exclusions');
      });
  }

  private renderRule(parent: HTMLElement, item: RuleExplanation): void {
    const group = parent.createDiv({ cls: 'advancedNoteMover-preview-group' });
    const head = group.createDiv({
      cls: 'advancedNoteMover-preview-group-head',
    });
    statusIcon(head, item.matched, false);
    head.createSpan({
      cls: 'advancedNoteMover-strong',
      text: item.rule.name || strings().unnamedRule,
    });
    head.createSpan({ cls: 'advancedNoteMover-grow' });
    const mode = strings().ruleSummary;
    head.createSpan({
      cls: 'advancedNoteMover-row-meta',
      text:
        item.movesTo !== null
          ? fill(strings().whyNotFragments.wouldMove, { folder: item.movesTo })
          : fill(strings().whyNotFragments.needs, {
              mode: {
                all: mode.matchAll,
                any: mode.matchAny,
                none: mode.matchNone,
              }[item.rule.aggregation],
            }),
    });
    const body = group.createDiv({
      cls: 'advancedNoteMover-preview-group-body',
    });
    for (const condition of item.conditions) {
      const row = body.createDiv({ cls: 'advancedNoteMover-preview-row' });
      statusIcon(row, condition.passed, true);
      this.renderCondition(row, condition);
      row.createSpan({ cls: 'advancedNoteMover-grow' });
      row.createSpan({
        cls: 'advancedNoteMover-row-meta',
        text: reasonText(condition.reason),
      });
    }
  }

  private renderCondition(
    parent: HTMLElement,
    { trigger }: ConditionExplanation
  ): void {
    const text = parent.createSpan({ cls: 'advancedNoteMover-row-name' });
    const kbd = (value: string) =>
      text.createEl('kbd', { cls: 'advancedNoteMover-kbd', text: value });
    const space = () => text.appendText(' ');
    const isProperty = trigger.criteriaType === 'properties';
    text.appendText(strings().ruleEditorTypes[trigger.criteriaType]);
    if (isProperty && trigger.propertyName) {
      space();
      kbd(trigger.propertyName);
    }
    space();
    text.appendText(
      operatorLabel(String(trigger.operator), strings().ruleSummary.operators)
    );
    if (trigger.value.trim()) {
      space();
      kbd(trigger.value);
    }
  }
}

class NotePickModal extends FuzzySuggestModal<TFile> {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private onPick: (file: TFile) => void
  ) {
    super(plugin.app);
    this.setPlaceholder(strings().modals.whyNotPick);
  }

  getItems(): TFile[] {
    return this.plugin.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onPick(file);
  }
}

export function openWhyNotMovedForFile(
  plugin: AdvancedNoteMoverPlugin,
  file: TFile
): void {
  new WhyNotMovedModal(plugin, file).open();
}

export function pickNoteForWhyNot(plugin: AdvancedNoteMoverPlugin): void {
  new NotePickModal(plugin, file => {
    openWhyNotMovedForFile(plugin, file);
  }).open();
}

/** Explains the active note; asks for one only when no markdown note is open. */
export function openWhyNotMoved(plugin: AdvancedNoteMoverPlugin): void {
  const active = plugin.app.workspace.getActiveFile();
  if (active && active.extension === 'md') {
    openWhyNotMovedForFile(plugin, active);
  } else {
    pickNoteForWhyNot(plugin);
  }
}
