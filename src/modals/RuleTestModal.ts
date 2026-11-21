import { App, FuzzySuggestModal, TFile } from 'obsidian';
import { testRules, type RuleTestResult } from '../domain/rules/v2/ruleTester';
import { fileMetadataFromCache } from './rule-editor/ruleLivePreview';
import { fill, strings } from '../i18n/locale';
import type { RuleV2 } from '../types/RuleV2';
import { BaseModal } from './BaseModal';

function reasonText(result: RuleTestResult): string {
  if (result.status === 'matched') {
    return strings().modals.whyNotMovedMatched;
  }
  if (result.status === 'inactive') {
    return strings().modals.whyNotMovedInactive;
  }
  if (result.status === 'empty' || !result.failedCondition) {
    return strings().modals.whyNotMovedEmpty;
  }
  const failed = result.failedCondition;
  return fill(strings().modals.whyNotMovedFailed, {
    condition: `${failed.criteriaType} ${failed.operator} ${failed.value}`,
  });
}

export class RuleTestModal extends BaseModal {
  constructor(
    app: App,
    private results: readonly RuleTestResult[]
  ) {
    super(app, {
      title: strings().modals.whyNotMovedTitle,
      useNativeTitle: true,
      cssClass: 'advancedNoteMover-rule-test-modal',
    });
  }

  protected createContent(): void {
    const list = this.contentEl.createDiv({
      cls: 'advancedNoteMover-rule-test-list',
    });
    if (this.results.length === 0) {
      list.createDiv({ text: strings().modals.whyNotMovedNoRules });
      return;
    }
    for (const result of this.results) {
      const row = list.createDiv({ cls: 'advancedNoteMover-rule-test-row' });
      row.createDiv({
        cls: 'advancedNoteMover-rule-test-name',
        text: result.ruleName || strings().unnamedRule,
      });
      row.createDiv({
        cls: 'advancedNoteMover-rule-test-reason',
        text: reasonText(result),
      });
    }
  }
}

class NotePickModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private onPick: (file: TFile) => void
  ) {
    super(app);
    this.setPlaceholder(strings().modals.whyNotMovedPick);
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onPick(file);
  }
}

export function openWhyNotMoved(app: App, rules: readonly RuleV2[]): void {
  new NotePickModal(app, file => {
    const metadata = fileMetadataFromCache(
      file,
      app.metadataCache.getFileCache(file)
    );
    new RuleTestModal(app, testRules(metadata, rules)).open();
  }).open();
}
