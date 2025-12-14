import { RuleV2 } from '../../../types/RuleV2';
import { Rule } from '../../../types/Rule';
import { setIcon } from 'obsidian';
import { MobileUtils } from '../../../utils/MobileUtils';

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

    // Move Up button
    if (callbacks.canMoveUp !== false) {
      const upButton = MobileUtils.createMoveButton(
        this.moveButtonsContainer,
        'up',
        async () => {
          if (callbacks.onMoveUp) {
            await callbacks.onMoveUp();
          }
        },
        false
      );
      if (upButton) {
        this.moveUpButton = upButton;
      }
    }

    // Move Down button
    if (callbacks.canMoveDown !== false) {
      const downButton = MobileUtils.createMoveButton(
        this.moveButtonsContainer,
        'down',
        async () => {
          if (callbacks.onMoveDown) {
            await callbacks.onMoveDown();
          }
        },
        false
      );
      if (downButton) {
        this.moveDownButton = downButton;
      }
    }

    // Edit button
    this.editButton = this.actionsEl.createEl('button', {
      cls: 'noteMover-mobile-action-btn noteMover-mobile-edit-btn',
      text: 'Edit',
    });
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

    // Move Up button
    if (callbacks.canMoveUp !== false) {
      const upButton = MobileUtils.createMoveButton(
        this.moveButtonsContainer,
        'up',
        async () => {
          if (callbacks.onMoveUp) {
            await callbacks.onMoveUp();
          }
        },
        false
      );
      if (upButton) {
        this.moveUpButton = upButton;
      }
    }

    // Move Down button
    if (callbacks.canMoveDown !== false) {
      const downButton = MobileUtils.createMoveButton(
        this.moveButtonsContainer,
        'down',
        async () => {
          if (callbacks.onMoveDown) {
            await callbacks.onMoveDown();
          }
        },
        false
      );
      if (downButton) {
        this.moveDownButton = downButton;
      }
    }

    // Delete button
    this.deleteButton = this.cardEl.createEl('button', {
      cls: 'noteMover-mobile-action-btn noteMover-mobile-delete-btn',
      text: 'Delete',
    });

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
