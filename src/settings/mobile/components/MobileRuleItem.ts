import { RuleV2 } from '../../../types/RuleV2';
import { Rule } from '../../../types/Rule';

export interface MobileRuleItemCallbacks {
  onToggle?: (active: boolean) => void | Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
}

/**
 * Mobile-optimized rule item component for RuleV2
 */
export class MobileRuleItemV2 {
  private cardEl: HTMLElement;
  private headerEl: HTMLElement;
  private nameEl: HTMLElement;
  private toggleEl: HTMLElement;
  private toggleInput: HTMLInputElement;
  private actionsEl: HTMLElement;
  private editButton: HTMLButtonElement;
  private deleteButton: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    rule: RuleV2,
    callbacks: MobileRuleItemCallbacks
  ) {
    // Create card
    this.cardEl = container.createDiv({ cls: 'mobile-rule-card' });

    // Create header with name and toggle
    this.headerEl = this.cardEl.createDiv({ cls: 'mobile-rule-header' });
    this.nameEl = this.headerEl.createDiv({ cls: 'mobile-rule-name' });
    this.nameEl.textContent = rule.name || 'Unnamed Rule';

    // Create toggle
    this.toggleEl = this.headerEl.createDiv({ cls: 'mobile-rule-toggle' });
    this.toggleInput = document.createElement('input');
    this.toggleInput.type = 'checkbox';
    this.toggleInput.className = 'mobile-toggle-input';
    this.toggleInput.checked = rule.active;
    this.toggleEl.appendChild(this.toggleInput);

    const toggleSlider = this.toggleEl.createDiv({
      cls: 'mobile-toggle-slider',
    });

    this.updateToggleState(rule.active);

    // Toggle handler
    this.toggleInput.addEventListener('change', async () => {
      const newValue = this.toggleInput.checked;
      this.updateToggleState(newValue);
      if (callbacks.onToggle) {
        await callbacks.onToggle(newValue);
      }
    });

    this.toggleEl.addEventListener('click', e => {
      if (e.target !== this.toggleInput) {
        this.toggleInput.click();
      }
    });

    // Create actions row
    this.actionsEl = this.cardEl.createDiv({ cls: 'mobile-rule-actions' });

    // Edit button
    this.editButton = this.actionsEl.createEl('button', {
      cls: 'mobile-action-btn mobile-edit-btn',
      text: 'Edit',
    });
    this.editButton.style.width = '100%';
    this.editButton.style.minHeight = '48px';
    this.editButton.style.marginBottom = '8px';
    this.editButton.addEventListener('click', () => {
      if (callbacks.onEdit) {
        callbacks.onEdit();
      }
    });

    // Delete button
    this.deleteButton = this.actionsEl.createEl('button', {
      cls: 'mobile-action-btn mobile-delete-btn',
      text: 'Delete',
    });
    this.deleteButton.style.width = '100%';
    this.deleteButton.style.minHeight = '48px';
    this.deleteButton.style.background = 'var(--background-modifier-error)';
    this.deleteButton.style.color = 'var(--text-on-accent)';
    this.deleteButton.addEventListener('click', async () => {
      if (callbacks.onDelete) {
        await callbacks.onDelete();
      }
    });
  }

  private updateToggleState(value: boolean): void {
    if (value) {
      this.toggleEl.addClass('is-active');
    } else {
      this.toggleEl.removeClass('is-active');
    }
    // Also update the input state
    this.toggleInput.checked = value;
  }

  setActive(active: boolean): void {
    this.toggleInput.checked = active;
    this.updateToggleState(active);
  }

  getCardElement(): HTMLElement {
    return this.cardEl;
  }
}

/**
 * Mobile-optimized rule item component for RuleV1
 */
export class MobileRuleItemV1 {
  private cardEl: HTMLElement;
  private criteriaInput: HTMLInputElement;
  private pathInput: HTMLInputElement;
  private deleteButton: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    rule: Rule,
    callbacks: {
      onCriteriaChange?: (value: string) => void | Promise<void>;
      onPathChange?: (value: string) => void | Promise<void>;
      onDelete?: () => void | Promise<void>;
    }
  ) {
    // Create card
    this.cardEl = container.createDiv({ cls: 'mobile-rule-card' });

    // Criteria input
    const criteriaLabel = this.cardEl.createDiv({
      cls: 'mobile-input-label',
      text: 'Criteria',
    });
    this.criteriaInput = this.cardEl.createEl('input', {
      cls: 'mobile-text-input',
      type: 'text',
      attr: {
        placeholder: 'e.g., tag: #project',
        value: rule.criteria || '',
      },
    });
    this.criteriaInput.style.width = '100%';
    this.criteriaInput.style.minHeight = '48px';
    this.criteriaInput.style.fontSize = '16px';
    this.criteriaInput.style.padding = '12px';
    this.criteriaInput.style.marginBottom = '12px';
    this.criteriaInput.style.boxSizing = 'border-box';

    if (callbacks.onCriteriaChange) {
      this.criteriaInput.addEventListener('input', async () => {
        if (callbacks.onCriteriaChange) {
          await callbacks.onCriteriaChange(this.criteriaInput.value);
        }
      });
    }

    // Path input
    const pathLabel = this.cardEl.createDiv({
      cls: 'mobile-input-label',
      text: 'Destination Path',
    });
    this.pathInput = this.cardEl.createEl('input', {
      cls: 'mobile-text-input',
      type: 'text',
      attr: {
        placeholder: 'e.g., Projects/',
        value: rule.path || '',
      },
    });
    this.pathInput.style.width = '100%';
    this.pathInput.style.minHeight = '48px';
    this.pathInput.style.fontSize = '16px';
    this.pathInput.style.padding = '12px';
    this.pathInput.style.marginBottom = '12px';
    this.pathInput.style.boxSizing = 'border-box';

    if (callbacks.onPathChange) {
      this.pathInput.addEventListener('input', async () => {
        if (callbacks.onPathChange) {
          await callbacks.onPathChange(this.pathInput.value);
        }
      });
    }

    // Delete button
    this.deleteButton = this.cardEl.createEl('button', {
      cls: 'mobile-action-btn mobile-delete-btn',
      text: 'Delete',
    });
    this.deleteButton.style.width = '100%';
    this.deleteButton.style.minHeight = '48px';
    this.deleteButton.style.background = 'var(--background-modifier-error)';
    this.deleteButton.style.color = 'var(--text-on-accent)';

    if (callbacks.onDelete) {
      this.deleteButton.addEventListener('click', async () => {
        if (callbacks.onDelete) {
          await callbacks.onDelete();
        }
      });
    }
  }

  getCriteriaValue(): string {
    return this.criteriaInput.value;
  }

  getPathValue(): string {
    return this.pathInput.value;
  }

  setCriteriaValue(value: string): void {
    this.criteriaInput.value = value;
  }

  setPathValue(value: string): void {
    this.pathInput.value = value;
  }

  getCardElement(): HTMLElement {
    return this.cardEl;
  }
}
