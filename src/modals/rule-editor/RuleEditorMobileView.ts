import {
  App,
  ButtonComponent,
  DropdownComponent,
  ExtraButtonComponent,
  TextComponent,
  ToggleComponent,
  setIcon,
} from 'obsidian';
import type {
  AggregationType,
  CriteriaType,
  Operator,
  RuleV2,
  Trigger,
} from '../../types/RuleV2';
import { FolderSuggest } from '../../settings/suggesters/FolderSuggest';
import { PropertySuggest } from '../../settings/suggesters/PropertySuggest';
import { operatorRequiresValue } from '../../utils/OperatorMapping';
import type { PluginVaultIndexCache } from '../../infrastructure/cache/plugin-vault-index-cache';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import {
  AGGREGATION_TYPES,
  CRITERIA_TYPES,
  DESTINATION_DESCRIPTION,
  DESTINATION_SHORT_HINT,
  DESTINATION_TEMPLATE_EXAMPLES,
  FolderCreationValue,
  applyCriteriaType,
  applyFolderCreationValue,
  applyPropertyName,
  attachValueSuggester,
  capitalize,
  createDefaultTrigger,
  getFolderCreationValue,
  getOperatorsForTrigger,
  getValuePlaceholder,
  moveTrigger,
  removeTrigger,
} from './ruleEditorShared';

const CLS = 'advancedNoteMover-rule-mobile';

const AGGREGATION_DESCRIPTIONS: Record<AggregationType, string> = {
  all: 'Every condition must match.',
  any: 'At least one condition must match.',
  none: 'No condition may match.',
};

export interface RuleEditorMobileViewOptions {
  app: App;
  /** Working copy of the rule; mutated in place. */
  rule: RuleV2;
  canDelete: boolean;
  vaultIndexCache?: PluginVaultIndexCache;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

interface Field {
  fieldEl: HTMLElement;
  controlEl: HTMLElement;
  inputId: string;
}

/**
 * Single-column, touch-first rule editor used on phones and tablets.
 * Layout: scrollable body with grouped fields and condition cards, pinned footer.
 */
export class RuleEditorMobileView {
  private readonly options: RuleEditorMobileViewOptions;
  private conditionsListEl: HTMLElement | null = null;
  private conditionsCountEl: HTMLElement | null = null;
  private fieldCounter = 0;

  constructor(options: RuleEditorMobileViewOptions) {
    this.options = options;
  }

  private get rule(): RuleV2 {
    return this.options.rule;
  }

  render(container: HTMLElement): void {
    const root = container.createDiv({ cls: CLS });
    const body = root.createDiv({ cls: `${CLS}-body` });

    this.renderGeneralGroup(body);
    this.renderMatchGroup(body);
    this.renderDestinationGroup(body);
    this.renderConditionsSection(body);
    if (this.options.canDelete) {
      this.renderDeleteSection(body);
    }

    this.renderFooter(root);
  }

  // ---------------------------------------------------------------------------
  // Groups
  // ---------------------------------------------------------------------------

  private renderGeneralGroup(parent: HTMLElement): void {
    const group = this.createGroup(parent);

    const nameField = this.createField(group, 'Name');
    new TextComponent(nameField.controlEl)
      .setPlaceholder('Enter rule name')
      .setValue(this.rule.name)
      .onChange(value => {
        this.rule.name = value;
      })
      .then(text => {
        text.inputEl.id = nameField.inputId;
        text.inputEl.addClass(`${CLS}-input`);
      });

    const activeRow = group.createDiv({ cls: `${CLS}-switch-row` });
    const activeText = activeRow.createDiv({ cls: `${CLS}-switch-text` });
    const activeLabelId = this.nextId();
    activeText.createDiv({
      cls: `${CLS}-label`,
      text: 'Active',
      attr: { id: activeLabelId },
    });
    const activeDesc = activeText.createDiv({ cls: `${CLS}-description` });
    const updateActiveDesc = (active: boolean) => {
      activeDesc.setText(
        active
          ? 'This rule is applied when notes are moved.'
          : 'This rule is skipped.'
      );
    };
    updateActiveDesc(this.rule.active);

    new ToggleComponent(activeRow)
      .setValue(this.rule.active)
      .onChange(value => {
        this.rule.active = value;
        updateActiveDesc(value);
      })
      .then(toggle => {
        toggle.toggleEl.setAttr('aria-labelledby', activeLabelId);
      });
  }

  private renderMatchGroup(parent: HTMLElement): void {
    const group = this.createGroup(parent);
    const labelId = this.nextId();
    group.createDiv({
      cls: `${CLS}-label`,
      text: 'Match conditions',
      attr: { id: labelId },
    });

    const segmented = group.createDiv({
      cls: `${CLS}-segmented`,
      attr: { role: 'radiogroup', 'aria-labelledby': labelId },
    });
    const description = group.createDiv({ cls: `${CLS}-description` });

    const buttons: HTMLButtonElement[] = [];
    const update = () => {
      buttons.forEach((button, i) => {
        const selected = AGGREGATION_TYPES[i] === this.rule.aggregation;
        button.toggleClass('is-active', selected);
        button.setAttr('aria-checked', String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      description.setText(AGGREGATION_DESCRIPTIONS[this.rule.aggregation]);
      this.updateConditionConnectors();
    };

    AGGREGATION_TYPES.forEach(aggregation => {
      const button = segmented.createEl('button', {
        cls: `${CLS}-segment`,
        text: capitalize(aggregation),
        attr: { type: 'button', role: 'radio' },
      });
      button.addEventListener('click', () => {
        this.rule.aggregation = aggregation;
        update();
      });
      buttons.push(button);
    });

    update();
  }

  private renderDestinationGroup(parent: HTMLElement): void {
    const group = this.createGroup(parent);

    const destinationField = this.createField(group, 'Destination', {
      description: DESTINATION_SHORT_HINT,
    });
    new TextComponent(destinationField.controlEl)
      .setPlaceholder('Example: Projects/{{tag.project}}')
      .setValue(this.rule.destination)
      .onChange(value => {
        this.rule.destination = value;
      })
      .then(text => {
        const input = text.inputEl;
        input.id = destinationField.inputId;
        input.addClass(`${CLS}-input`);
        this.disableTextAssistance(input);
        new FolderSuggest(this.options.app, input);
      });

    const details = group.createEl('details', { cls: `${CLS}-help` });
    details.createEl('summary', { text: 'Template examples' });
    const helpBody = details.createDiv({ cls: `${CLS}-help-body` });
    const list = helpBody.createEl('ul', { cls: `${CLS}-help-list` });
    DESTINATION_TEMPLATE_EXAMPLES.forEach(example => {
      const item = list.createEl('li');
      item.createEl('code', { text: example.template });
      item.createDiv({
        cls: `${CLS}-description`,
        text: example.description,
      });
    });
    helpBody.createDiv({
      cls: `${CLS}-description`,
      text: DESTINATION_DESCRIPTION,
    });

    const folderField = this.createField(
      group,
      SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_NAME,
      { description: SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_DESC }
    );
    new DropdownComponent(folderField.controlEl)
      .addOption(
        'inherit',
        SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_INHERIT
      )
      .addOption(
        'always',
        SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_ALWAYS
      )
      .addOption('never', SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_NEVER)
      .setValue(getFolderCreationValue(this.rule))
      .onChange(value => {
        applyFolderCreationValue(this.rule, value as FolderCreationValue);
      })
      .then(dropdown => {
        dropdown.selectEl.id = folderField.inputId;
        dropdown.selectEl.addClass(`${CLS}-select`);
      });
  }

  private renderConditionsSection(parent: HTMLElement): void {
    const section = parent.createDiv({ cls: `${CLS}-conditions` });

    const header = section.createDiv({ cls: `${CLS}-section-header` });
    header.createDiv({ cls: `${CLS}-section-title`, text: 'Conditions' });
    this.conditionsCountEl = header.createDiv({ cls: `${CLS}-count` });

    this.conditionsListEl = section.createDiv({
      cls: `${CLS}-condition-list`,
    });
    this.renderConditions();

    new ButtonComponent(section)
      .setButtonText('Add condition')
      .then(button => {
        const iconEl = button.buttonEl.createSpan();
        setIcon(iconEl, 'plus');
        button.buttonEl.prepend(iconEl);
      })
      .onClick(() => {
        this.rule.triggers.push(createDefaultTrigger());
        this.renderConditions();
        const cards = this.conditionsListEl?.querySelectorAll(
          `.${CLS}-condition`
        );
        cards?.[cards.length - 1]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      })
      .then(button => {
        button.buttonEl.addClass(`${CLS}-add-button`);
      });
  }

  private renderDeleteSection(parent: HTMLElement): void {
    const section = parent.createDiv({ cls: `${CLS}-danger` });
    new ButtonComponent(section)
      .setButtonText('Delete rule')
      .onClick(() => this.options.onDelete())
      .then(button => {
        button.buttonEl.addClass('mod-warning', `${CLS}-block-button`);
      });
  }

  private renderFooter(parent: HTMLElement): void {
    const footer = parent.createDiv({ cls: `${CLS}-footer` });
    new ButtonComponent(footer)
      .setButtonText('Cancel')
      .onClick(() => this.options.onCancel())
      .then(button => {
        button.buttonEl.addClass(`${CLS}-block-button`);
      });
    new ButtonComponent(footer)
      .setButtonText('Save')
      .setCta()
      .onClick(() => this.options.onSave())
      .then(button => {
        button.buttonEl.addClass(`${CLS}-block-button`);
      });
  }

  // ---------------------------------------------------------------------------
  // Conditions
  // ---------------------------------------------------------------------------

  private renderConditions(): void {
    const list = this.conditionsListEl;
    if (!list) return;
    list.empty();

    const triggers = this.rule.triggers;
    triggers.forEach((trigger, index) => {
      if (index > 0) {
        list.createDiv({ cls: `${CLS}-connector` });
      }
      this.renderConditionCard(list, trigger, index);
    });

    this.conditionsCountEl?.setText(String(triggers.length));
    this.updateConditionConnectors();
  }

  private updateConditionConnectors(): void {
    const text = this.rule.aggregation === 'all' ? 'and' : 'or';
    this.conditionsListEl
      ?.querySelectorAll<HTMLElement>(`.${CLS}-connector`)
      .forEach(el => el.setText(text));
  }

  private renderConditionCard(
    list: HTMLElement,
    trigger: Trigger,
    index: number
  ): void {
    const triggers = this.rule.triggers;
    const card = list.createDiv({ cls: `${CLS}-condition` });

    const header = card.createDiv({ cls: `${CLS}-condition-header` });
    header.createDiv({
      cls: `${CLS}-condition-title`,
      text: `Condition ${index + 1}`,
    });
    const actions = header.createDiv({ cls: `${CLS}-condition-actions` });

    new ExtraButtonComponent(actions)
      .setIcon('arrow-up')
      .setTooltip('Move up')
      .setDisabled(index === 0)
      .onClick(() => {
        moveTrigger(triggers, index, index - 1);
        this.renderConditions();
      });
    new ExtraButtonComponent(actions)
      .setIcon('arrow-down')
      .setTooltip('Move down')
      .setDisabled(index === triggers.length - 1)
      .onClick(() => {
        moveTrigger(triggers, index, index + 1);
        this.renderConditions();
      });
    new ExtraButtonComponent(actions)
      .setIcon('trash-2')
      .setTooltip('Delete condition')
      .onClick(() => {
        removeTrigger(triggers, index);
        this.renderConditions();
      })
      .then(button => {
        button.extraSettingsEl.addClass(`${CLS}-delete-icon`);
      });

    const body = card.createDiv({ cls: `${CLS}-condition-body` });
    this.renderConditionBody(body, trigger);
  }

  private renderConditionBody(body: HTMLElement, trigger: Trigger): void {
    body.empty();

    const selectors = body.createDiv({ cls: `${CLS}-condition-selectors` });

    const typeField = this.createField(selectors, 'Type');
    const typeDropdown = new DropdownComponent(typeField.controlEl);
    CRITERIA_TYPES.forEach(ct => {
      typeDropdown.addOption(ct, ct);
    });
    typeDropdown.setValue(trigger.criteriaType).onChange(value => {
      applyCriteriaType(trigger, value as CriteriaType);
      this.renderConditionBody(body, trigger);
    });
    typeDropdown.selectEl.id = typeField.inputId;
    typeDropdown.selectEl.addClass(`${CLS}-select`);

    const operatorField = this.createField(selectors, 'Operator');
    const operatorDropdown = new DropdownComponent(operatorField.controlEl);
    operatorDropdown.selectEl.id = operatorField.inputId;
    operatorDropdown.selectEl.addClass(`${CLS}-select`);

    const propertySlot = body.createDiv({ cls: `${CLS}-slot` });
    const valueSlot = body.createDiv({ cls: `${CLS}-slot` });

    const renderValue = () => {
      valueSlot.empty();
      if (!operatorRequiresValue(trigger.operator)) {
        return;
      }
      const valueField = this.createField(valueSlot, 'Value');
      new TextComponent(valueField.controlEl)
        .setPlaceholder(getValuePlaceholder(trigger))
        .setValue(trigger.value)
        .onChange(value => {
          trigger.value = value;
        })
        .then(text => {
          const input = text.inputEl;
          input.id = valueField.inputId;
          input.addClass(`${CLS}-input`);
          this.disableTextAssistance(input);
          attachValueSuggester(
            this.options.app,
            input,
            trigger,
            this.options.vaultIndexCache
          );
        });
    };

    const renderOperators = () => {
      operatorDropdown.selectEl.empty();
      const operators = getOperatorsForTrigger(trigger);
      operators.forEach(op => {
        operatorDropdown.addOption(op, op);
      });
      if (!operators.includes(trigger.operator)) {
        trigger.operator = operators[0];
      }
      operatorDropdown.setValue(trigger.operator);
    };

    operatorDropdown.onChange(value => {
      trigger.operator = value as Operator;
      renderValue();
    });

    if (trigger.criteriaType === 'properties') {
      const propertyField = this.createField(propertySlot, 'Property');
      new TextComponent(propertyField.controlEl)
        .setPlaceholder('Property name')
        .setValue(trigger.propertyName ?? '')
        .onChange(value => {
          const previousType = trigger.propertyType;
          applyPropertyName(
            this.options.app,
            trigger,
            value,
            this.options.vaultIndexCache
          );
          if (trigger.propertyType !== previousType) {
            renderOperators();
            renderValue();
          }
        })
        .then(text => {
          const input = text.inputEl;
          input.id = propertyField.inputId;
          input.addClass(`${CLS}-input`);
          this.disableTextAssistance(input);
          new PropertySuggest(this.options.app, input);
        });
    }

    renderOperators();
    renderValue();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private createGroup(parent: HTMLElement): HTMLElement {
    return parent.createDiv({ cls: `${CLS}-group` });
  }

  private createField(
    parent: HTMLElement,
    label: string,
    options: { description?: string } = {}
  ): Field {
    const inputId = this.nextId();
    const fieldEl = parent.createDiv({ cls: `${CLS}-field` });
    fieldEl.createEl('label', {
      cls: `${CLS}-label`,
      text: label,
      attr: { for: inputId },
    });
    if (options.description) {
      fieldEl.createDiv({
        cls: `${CLS}-description`,
        text: options.description,
      });
    }
    const controlEl = fieldEl.createDiv({ cls: `${CLS}-control` });
    return { fieldEl, controlEl, inputId };
  }

  private nextId(): string {
    this.fieldCounter += 1;
    return `${CLS}-field-${this.fieldCounter}`;
  }

  /** Paths, tags and property names should not be autocorrected or capitalized. */
  private disableTextAssistance(input: HTMLInputElement): void {
    input.setAttr('autocapitalize', 'off');
    input.setAttr('autocorrect', 'off');
    input.spellcheck = false;
  }
}
