import { setIcon, type App } from 'obsidian';
import { strings } from '../../../i18n/locale';
import type { ConditionIssue } from '../../../domain/rules/ruleValidation';
import type { PluginVaultIndexCache } from '../../../infrastructure/cache/plugin-vault-index-cache';
import { SuggestRegistry } from '../../../settings/suggesters/suggestLifecycle';
import type { CriteriaType, RuleV2, Trigger } from '../../../types/RuleV2';
import { DragDropManager } from '../../../utils/DragDropManager';
import {
  addCondition,
  removeCondition,
  reorderConditions,
} from '../ruleEditorState';
import { applyCriteriaType } from '../ruleEditorShared';
import { renderConditionRow, type ConditionRowHandle } from './ConditionRow';

export interface ConditionListOptions {
  app: App;
  /** The draft. The list changes its `triggers` in place. */
  rule: RuleV2;
  vaultIndexCache?: PluginVaultIndexCache;
  /** Called after any change to the conditions. */
  onChange: () => void;
}

function joinerText(rule: RuleV2): string {
  const words = strings().ruleSummary;
  if (rule.aggregation === 'any') return words.or;
  return rule.aggregation === 'none' ? words.andNot : words.and;
}

/** Conditions with joiners, drag and keyboard reorder, and the add button. */
export class ConditionList {
  private readonly rowsEl: HTMLElement;
  private readonly suggests = new SuggestRegistry();
  private readonly joiners: HTMLElement[] = [];
  private handles: ConditionRowHandle[] = [];
  private drag: DragDropManager | null = null;
  /** New conditions that still show "Choose…". */
  private readonly pending = new WeakSet<Trigger>();
  private readonly touched = new WeakSet<Trigger>();
  private issues: ConditionIssue[] = [];

  constructor(
    parent: HTMLElement,
    private readonly options: ConditionListOptions
  ) {
    this.rowsEl = parent.createDiv();
    const add = parent
      .createDiv({ cls: 'advancedNoteMover-add-condition' })
      .createEl('button', {
        cls: 'advancedNoteMover-quiet-button',
        attr: { type: 'button' },
      });
    setIcon(add.createSpan(), 'plus');
    add.createSpan({ text: strings().modals.ruleEditorAddCondition });
    add.addEventListener('click', () => this.addNew());
    this.render();
  }

  /** Conditions that block saving: no type yet, or an invalid value. */
  blockingCount(issues: ConditionIssue[]): number {
    return this.options.rule.triggers.filter(
      (trigger, i) => this.pending.has(trigger) || issues[i]
    ).length;
  }

  /** Empty values the user has not left yet. They block saving but show no error. */
  unflaggedCount(issues: ConditionIssue[]): number {
    return this.options.rule.triggers.filter(
      (trigger, i) =>
        this.pending.has(trigger) ||
        (issues[i]?.kind === 'valueEmpty' && !this.touched.has(trigger))
    ).length;
  }

  /** The condition whose value or type is missing first, for the empty hint. */
  firstIncomplete(issues: ConditionIssue[]): Trigger | null {
    const { triggers } = this.options.rule;
    const index = triggers.findIndex(
      (trigger, i) =>
        this.pending.has(trigger) || issues[i]?.kind === 'valueEmpty'
    );
    return index === -1 ? null : triggers[index];
  }

  isPending(trigger: Trigger): boolean {
    return this.pending.has(trigger);
  }

  /** Shows value errors once a field was left or the condition is invalid after a regex edit. */
  setIssues(issues: ConditionIssue[]): void {
    this.issues = issues;
    this.handles.forEach((handle, index) => {
      const trigger = this.options.rule.triggers[index];
      const issue = issues[index] ?? null;
      const visible =
        issue?.kind === 'invalidRegex' || this.touched.has(trigger);
      handle.setIssue(visible ? issue : null);
    });
  }

  /** Match mode changed: only the joiner words change. */
  refreshJoiners(): void {
    for (const joiner of this.joiners)
      joiner.setText(joinerText(this.options.rule));
  }

  destroy(): void {
    this.drag?.destroy();
    this.drag = null;
    this.suggests.destroy();
  }

  private addNew(): void {
    const { rule } = this.options;
    rule.triggers = addCondition(rule).triggers;
    this.pending.add(rule.triggers[rule.triggers.length - 1]);
    this.render();
    this.options.onChange();
    this.handles[this.handles.length - 1]?.typeButton.click();
  }

  private render(focus?: { index: number; entry: boolean }): void {
    const { rule } = this.options;
    this.drag?.destroy();
    this.suggests.destroy();
    this.rowsEl.empty();
    this.joiners.length = 0;
    this.handles = rule.triggers.map((trigger, index) => {
      if (index > 0) {
        this.joiners.push(
          this.rowsEl.createDiv({
            cls: 'advancedNoteMover-condition-joiner',
            text: joinerText(rule),
          })
        );
      }
      return renderConditionRow(this.rowsEl, {
        index,
        count: rule.triggers.length,
        onMove: direction => this.move(index, index + direction),
        app: this.options.app,
        trigger,
        typeChosen: !this.pending.has(trigger),
        suggests: this.suggests,
        vaultIndexCache: this.options.vaultIndexCache,
        onChooseType: type => this.choose(trigger, type),
        onDraftChange: () => this.options.onChange(),
        onValueBlur: () => {
          this.touched.add(trigger);
          this.setIssues(this.issues);
        },
        onRemove: () => {
          rule.triggers = removeCondition(
            rule,
            rule.triggers.indexOf(trigger)
          ).triggers;
          this.render();
          this.options.onChange();
        },
      });
    });
    this.drag = new DragDropManager(this.rowsEl, {
      itemSelector: '.advancedNoteMover-condition',
      onReorder: (from, to) => this.move(from, from < to ? to - 1 : to),
      onMove: (index, direction) => this.move(index, index + direction, true),
    });
    this.setIssues(this.issues);
    if (focus) {
      const handle = this.handles[focus.index];
      if (focus.entry) handle?.focusEntry();
      else
        handle?.el
          .querySelector<HTMLElement>('.advancedNoteMover-drag-handle')
          ?.focus();
    }
  }

  private choose(trigger: Trigger, type: CriteriaType): void {
    applyCriteriaType(trigger, type);
    this.pending.delete(trigger);
    this.render({
      index: this.options.rule.triggers.indexOf(trigger),
      entry: true,
    });
    this.options.onChange();
  }

  private move(from: number, to: number, keepHandleFocus = false): void {
    const { rule } = this.options;
    rule.triggers = reorderConditions(rule, from, to).triggers;
    this.issues = [];
    this.render(keepHandleFocus ? { index: to, entry: false } : undefined);
    this.options.onChange();
  }
}
