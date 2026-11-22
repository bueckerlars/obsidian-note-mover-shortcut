import { DropdownComponent } from 'obsidian';
import { strings } from '../../../i18n/locale';
import type { AggregationType } from '../../../types/RuleV2';
import { AGGREGATION_TYPES } from '../ruleEditorShared';

/** "When a note matches [all] of these conditions" with the mode as an inline dropdown. */
export function renderMatchModeSentence(
  parent: HTMLElement,
  options: {
    value: AggregationType;
    onChange: (value: AggregationType) => void;
  }
): void {
  const text = strings().modals;
  const words = strings().ruleSummary;
  const row = parent.createDiv({ cls: 'advancedNoteMover-section-title' });
  row.createSpan({ text: text.ruleEditorMatchLead });
  const labels: Record<AggregationType, string> = {
    all: words.matchAll,
    any: words.matchAny,
    none: words.matchNone,
  };
  const dropdown = new DropdownComponent(row);
  dropdown.selectEl.addClass('advancedNoteMover-inline-select');
  dropdown.selectEl.setAttribute('aria-label', text.ruleEditorMatch);
  for (const type of AGGREGATION_TYPES) dropdown.addOption(type, labels[type]);
  dropdown
    .setValue(options.value)
    .onChange(value => options.onChange(value as AggregationType));
  row.createSpan({
    cls: 'advancedNoteMover-match-tail',
    text: words.matchTail,
  });
}
