import { RuleV2 } from '../../../types/RuleV2';
import { Rule } from '../../../types/Rule';

export interface MobileRuleItemCallbacks {
  onToggle?: (active: boolean) => void | Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onMoveUp?: () => void | Promise<void>;
  onMoveDown?: () => void | Promise<void>;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
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
  private moveButtonsContainer: HTMLElement;
  private moveUpButton: HTMLButtonElement;
  private moveDownButton: HTMLButtonElement;
  private editButton: HTMLButtonElement;
  private deleteButton: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    rule: RuleV2,
    callbacks: MobileRuleItemCallbacks
  ) {
    // Create card
    this.cardEl = container.createDiv({ cls: 'noteMover-mobile-rule-card' });

    // Create header with name and toggle
    this.headerEl = this.cardEl.createDiv({
      cls: 'noteMover-mobile-rule-header',
    });
    this.nameEl = this.headerEl.createDiv({
      cls: 'noteMover-mobile-rule-name',
    });
    this.nameEl.textContent = rule.name || 'Unnamed Rule';

    // Create toggle
    this.toggleEl = this.headerEl.createDiv({
      cls: 'noteMover-mobile-rule-toggle',
    });
    this.toggleInput = document.createElement('input');
    this.toggleInput.type = 'checkbox';
    this.toggleInput.className = 'noteMover-mobile-toggle-input';
    this.toggleInput.checked = rule.active;
    this.toggleEl.appendChild(this.toggleInput);

    const toggleSlider = this.toggleEl.createDiv({
      cls: 'noteMover-mobile-toggle-slider',
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
    this.actionsEl = this.cardEl.createDiv({
      cls: 'noteMover-mobile-rule-actions',
    });

    // Create move buttons container
    this.moveButtonsContainer = this.actionsEl.createDiv({
      cls: 'noteMover-mobile-move-buttons-container',
    });
    this.moveButtonsContainer.style.display = 'flex';
    this.moveButtonsContainer.style.gap = '8px';
    this.moveButtonsContainer.style.marginBottom = '8px';
    this.moveButtonsContainer.style.width = '100%';

    // Move Up button
    this.moveUpButton = this.moveButtonsContainer.createEl('button', {
      cls: 'noteMover-mobile-move-button noteMover-mobile-move-up-button',
    });
    this.moveUpButton.style.flex = '1';
    this.moveUpButton.style.minHeight = '48px';
    this.moveUpButton.style.display = 'flex';
    this.moveUpButton.style.alignItems = 'center';
    this.moveUpButton.style.justifyContent = 'center';
    this.moveUpButton.style.border =
      '1px solid var(--background-modifier-border)';
    this.moveUpButton.style.borderRadius = '6px';
    this.moveUpButton.style.background = 'var(--background-primary)';
    this.moveUpButton.style.cursor = 'pointer';
    this.moveUpButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
    this.moveUpButton.addEventListener('click', async () => {
      if (callbacks.onMoveUp) {
        await callbacks.onMoveUp();
      }
    });
    if (callbacks.canMoveUp === false) {
      this.moveUpButton.style.display = 'none';
    }

    // Move Down button
    this.moveDownButton = this.moveButtonsContainer.createEl('button', {
      cls: 'noteMover-mobile-move-button noteMover-mobile-move-down-button',
    });
    this.moveDownButton.style.flex = '1';
    this.moveDownButton.style.minHeight = '48px';
    this.moveDownButton.style.display = 'flex';
    this.moveDownButton.style.alignItems = 'center';
    this.moveDownButton.style.justifyContent = 'center';
    this.moveDownButton.style.border =
      '1px solid var(--background-modifier-border)';
    this.moveDownButton.style.borderRadius = '6px';
    this.moveDownButton.style.background = 'var(--background-primary)';
    this.moveDownButton.style.cursor = 'pointer';
    this.moveDownButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    this.moveDownButton.addEventListener('click', async () => {
      if (callbacks.onMoveDown) {
        await callbacks.onMoveDown();
      }
    });
    if (callbacks.canMoveDown === false) {
      this.moveDownButton.style.display = 'none';
    }

    // Edit button
    this.editButton = this.actionsEl.createEl('button', {
      cls: 'noteMover-mobile-action-btn noteMover-mobile-edit-btn',
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
      cls: 'noteMover-mobile-action-btn noteMover-mobile-delete-btn',
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
  private moveButtonsContainer: HTMLElement;
  private moveUpButton: HTMLButtonElement;
  private moveDownButton: HTMLButtonElement;
  private deleteButton: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    rule: Rule,
    callbacks: {
      onCriteriaChange?: (value: string) => void | Promise<void>;
      onPathChange?: (value: string) => void | Promise<void>;
      onDelete?: () => void | Promise<void>;
      onMoveUp?: () => void | Promise<void>;
      onMoveDown?: () => void | Promise<void>;
      canMoveUp?: boolean;
      canMoveDown?: boolean;
    }
  ) {
    // Create card
    this.cardEl = container.createDiv({ cls: 'noteMover-mobile-rule-card' });

    // Criteria input
    const criteriaLabel = this.cardEl.createDiv({
      cls: 'noteMover-mobile-input-label',
      text: 'Criteria',
    });
    this.criteriaInput = this.cardEl.createEl('input', {
      cls: 'noteMover-mobile-text-input',
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
      cls: 'noteMover-mobile-input-label',
      text: 'Destination Path',
    });
    this.pathInput = this.cardEl.createEl('input', {
      cls: 'noteMover-mobile-text-input',
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

    // Create move buttons container
    this.moveButtonsContainer = this.cardEl.createDiv({
      cls: 'noteMover-mobile-move-buttons-container',
    });
    this.moveButtonsContainer.style.display = 'flex';
    this.moveButtonsContainer.style.gap = '8px';
    this.moveButtonsContainer.style.marginBottom = '12px';
    this.moveButtonsContainer.style.width = '100%';

    // Move Up button
    this.moveUpButton = this.moveButtonsContainer.createEl('button', {
      cls: 'noteMover-mobile-move-button noteMover-mobile-move-up-button',
    });
    this.moveUpButton.style.flex = '1';
    this.moveUpButton.style.minHeight = '48px';
    this.moveUpButton.style.display = 'flex';
    this.moveUpButton.style.alignItems = 'center';
    this.moveUpButton.style.justifyContent = 'center';
    this.moveUpButton.style.border =
      '1px solid var(--background-modifier-border)';
    this.moveUpButton.style.borderRadius = '6px';
    this.moveUpButton.style.background = 'var(--background-primary)';
    this.moveUpButton.style.cursor = 'pointer';
    this.moveUpButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
    this.moveUpButton.addEventListener('click', async () => {
      if (callbacks.onMoveUp) {
        await callbacks.onMoveUp();
      }
    });
    if (callbacks.canMoveUp === false) {
      this.moveUpButton.style.display = 'none';
    }

    // Move Down button
    this.moveDownButton = this.moveButtonsContainer.createEl('button', {
      cls: 'noteMover-mobile-move-button noteMover-mobile-move-down-button',
    });
    this.moveDownButton.style.flex = '1';
    this.moveDownButton.style.minHeight = '48px';
    this.moveDownButton.style.display = 'flex';
    this.moveDownButton.style.alignItems = 'center';
    this.moveDownButton.style.justifyContent = 'center';
    this.moveDownButton.style.border =
      '1px solid var(--background-modifier-border)';
    this.moveDownButton.style.borderRadius = '6px';
    this.moveDownButton.style.background = 'var(--background-primary)';
    this.moveDownButton.style.cursor = 'pointer';
    this.moveDownButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    this.moveDownButton.addEventListener('click', async () => {
      if (callbacks.onMoveDown) {
        await callbacks.onMoveDown();
      }
    });
    if (callbacks.canMoveDown === false) {
      this.moveDownButton.style.display = 'none';
    }

    // Delete button
    this.deleteButton = this.cardEl.createEl('button', {
      cls: 'noteMover-mobile-action-btn noteMover-mobile-delete-btn',
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
