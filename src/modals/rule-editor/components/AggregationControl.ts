import { strings } from '../../../i18n/locale';
import type { AggregationType } from '../../../types/RuleV2';
import { AGGREGATION_TYPES } from '../ruleEditorShared';

export interface AggregationControlOptions {
  value: AggregationType;
  buttonClass: string;
  descriptionEl?: HTMLElement;
  onChange: (value: AggregationType) => void;
}

/** Match mode. Each option explains what a match requires. */
export function renderAggregationControl(
  parent: HTMLElement,
  options: AggregationControlOptions
): void {
  parent.setAttribute('role', 'radiogroup');
  parent.setAttribute('aria-label', strings().modals.ruleEditorMatch);
  parent.replaceChildren();

  const paint = (selected: AggregationType) => {
    const buttons = parent.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const aggregation = AGGREGATION_TYPES[index];
      const isSelected = aggregation === selected;
      button.classList.toggle('is-active', isSelected);
      button.setAttribute('aria-checked', String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    });
    if (options.descriptionEl) {
      options.descriptionEl.textContent =
        strings().ruleEditorAggregation[selected];
    }
  };

  const labels = {
    all: strings().modals.ruleEditorMatchAll,
    any: strings().modals.ruleEditorMatchAny,
    none: strings().modals.ruleEditorMatchNone,
  } as const;

  for (const aggregation of AGGREGATION_TYPES) {
    const button = parent.createEl('button', {
      text: labels[aggregation],
      cls: options.buttonClass,
    });
    button.setAttribute('type', 'button');
    button.setAttribute('role', 'radio');
    button.addEventListener('click', () => {
      options.onChange(aggregation);
      paint(aggregation);
    });
  }

  paint(options.value);
}
