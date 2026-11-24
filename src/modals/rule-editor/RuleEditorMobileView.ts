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
  CriteriaType,
  Operator,
  RuleV2,
  Trigger,
} from '../../types/RuleV2';
import { PropertySuggest } from '../../settings/suggesters/PropertySuggest';
import {
  SuggestRegistry,
  type DestroyableSuggest,
} from '../../settings/suggesters/suggestLifecycle';
import { operatorRequiresValue } from '../../utils/OperatorMapping';
import type { PluginVaultIndexCache } from '../../infrastructure/cache/plugin-vault-index-cache';
import { fill, strings } from '../../i18n/locale';
import { renderAggregationControl } from './components/AggregationControl';
import {
  renderDestinationHelp,
  renderDestinationInput,
} from './components/DestinationField';
import { renderRuleNameField } from './components/RuleNameField';
import {
  CRITERIA_TYPES,
  FolderCreationValue,
  applyCriteriaType,
  applyFolderCreationValue,
  applyPropertyName,
  attachValueSuggester,
  getFolderCreationValue,
  getOperatorsForTrigger,
  getValuePlaceholder,
} from './ruleEditorShared';
import {
  addCondition,
  removeCondition,
  reorderConditions,
} from './ruleEditorState';

const CLS = 'advancedNoteMover-rule-mobile';

export interface RuleEditorMobileViewOptions {
  app: App;
  /** Working copy of the rule; mutated in place. */
  rule: RuleV2;
  canDelete: boolean;
  vaultIndexCache?: PluginVaultIndexCache;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDraftChange?: () => void;
  renderLivePreview?: (parent: HTMLElement) => void;
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
  private destinationSuggest: DestroyableSuggest | null = null;
  private readonly conditionSuggests = new Map<Trigger, SuggestRegistry>();

  constructor(options: RuleEditorMobileViewOptions) {
    this.options = options;
  }

  destroy(): void {
    for (const registry of this.conditionSuggests.values()) {
      registry.destroy();
    }
    this.conditionSuggests.clear();
    this.destinationSuggest?.destroy();
    this.destinationSuggest = null;
  }

  private conditionRegistry(trigger: Trigger): SuggestRegistry {
    const existing = this.conditionSuggests.get(trigger);
    if (existing) {
      return existing;
    }
    const created = new SuggestRegistry();
    this.conditionSuggests.set(trigger, created);
    return created;
  }

  private get rule(): RuleV2 {
    return this.options.rule;
  }

  private noteDraft(): void {
    this.options.onDraftChange?.();
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

    const nameField = this.createField(group, strings().modals.ruleEditorName);
    renderRuleNameField(nameField.controlEl, {
      value: this.rule.name,
      id: nameField.inputId,
      className: `${CLS}-input`,
      onChange: value => {
        this.rule.name = value;
      },
    });

    const activeRow = group.createDiv({ cls: `${CLS}-switch-row` });
    const activeText = activeRow.createDiv({ cls: `${CLS}-switch-text` });
    const activeLabelId = this.nextId();
    activeText.createDiv({
      cls: `${CLS}-label`,
      text: strings().modals.ruleEditorActive,
      attr: { id: activeLabelId },
    });
    const activeDesc = activeText.createDiv({ cls: `${CLS}-description` });
    const updateActiveDesc = (active: boolean) => {
      activeDesc.setText(
        active
          ? strings().modals.ruleEditorActiveOn
          : strings().modals.ruleEditorActiveOff
      );
    };
    updateActiveDesc(this.rule.active);

    new ToggleComponent(activeRow)
      .setValue(this.rule.active)
      .onChange(value => {
        this.rule.active = value;
        updateActiveDesc(value);
        this.noteDraft();
      })
      .then(toggle => {
        const input = toggle.toggleEl.querySelector('input') ?? toggle.toggleEl;
        input.setAttribute('aria-labelledby', activeLabelId);
      });
  }

  private renderMatchGroup(parent: HTMLElement): void {
    const group = this.createGroup(parent);
    const labelId = this.nextId();
    group.createDiv({
      cls: `${CLS}-label`,
      text: strings().modals.ruleEditorMatch,
      attr: { id: labelId },
    });

    const segmented = group.createDiv({
      cls: `${CLS}-segmented`,
      attr: { 'aria-labelledby': labelId },
    });
    const description = group.createDiv({ cls: `${CLS}-description` });
    renderAggregationControl(segmented, {
      value: this.rule.aggregation,
      buttonClass: `${CLS}-segment`,
      descriptionEl: description,
      onChange: value => {
        this.rule.aggregation = value;
        this.updateConditionConnectors();
        this.noteDraft();
      },
    });
  }

  private renderDestinationGroup(parent: HTMLElement): void {
    const group = this.createGroup(parent);

    const destinationField = this.createField(
      group,
      strings().modals.ruleEditorDestination,
      { description: strings().modals.ruleEditorDestinationShort }
    );
    this.destinationSuggest?.destroy();
    const destination = renderDestinationInput(destinationField.controlEl, {
      app: this.options.app,
      value: this.rule.destination,
      placeholder: strings().modals.ruleEditorMobileDestinationPlaceholder,
      id: destinationField.inputId,
      className: `${CLS}-input`,
      onChange: value => {
        this.rule.destination = value;
      },
    });
    this.destinationSuggest = destination.suggest;

    renderDestinationHelp(group, template => {
      this.rule.destination = template;
      destination.input.value = template;
    });

    const folderField = this.createField(
      group,
      strings().modals.ruleEditorCreateFolderName,
      { description: strings().modals.ruleEditorCreateFolderDesc }
    );
    new DropdownComponent(folderField.controlEl)
      .addOption('inherit', strings().modals.ruleEditorInherit)
      .addOption('always', strings().modals.ruleEditorAlwaysCreate)
      .addOption('never', strings().modals.ruleEditorNeverCreate)
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

    this.options.renderLivePreview?.(section);

    const header = section.createDiv({ cls: `${CLS}-section-header` });
    header.createDiv({
      cls: `${CLS}-section-title`,
      text: strings().modals.ruleEditorConditionsLabel,
    });
    this.conditionsCountEl = header.createDiv({ cls: `${CLS}-count` });

    this.conditionsListEl = section.createDiv({
      cls: `${CLS}-condition-list`,
    });
    this.renderConditions();

    new ButtonComponent(section)
      .setButtonText(strings().modals.ruleEditorAddConditionMobile)
      .then(button => {
        const iconEl = button.buttonEl.createSpan();
        setIcon(iconEl, 'plus');
        button.buttonEl.prepend(iconEl);
      })
      .onClick(() => {
        this.rule.triggers = addCondition(this.rule).triggers;
        this.renderConditions();
        this.noteDraft();
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
      .setButtonText(strings().modals.ruleEditorDeleteRule)
      .onClick(() => this.options.onDelete())
      .then(button => {
        button.buttonEl.addClass('mod-warning', `${CLS}-block-button`);
      });
  }

  private renderFooter(parent: HTMLElement): void {
    const footer = parent.createDiv({ cls: `${CLS}-footer` });
    new ButtonComponent(footer)
      .setButtonText(strings().common.cancel)
      .onClick(() => this.options.onCancel())
      .then(button => {
        button.buttonEl.addClass(`${CLS}-block-button`);
      });
    new ButtonComponent(footer)
      .setButtonText(strings().common.save)
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
    for (const registry of this.conditionSuggests.values()) {
      registry.destroy();
    }
    this.conditionSuggests.clear();
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
    const text =
      this.rule.aggregation === 'all'
        ? strings().modals.ruleEditorConnectorAll
        : strings().modals.ruleEditorConnectorAny;
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
      text: fill(strings().modals.ruleEditorCondition, {
        index: String(index + 1),
      }),
    });
    const actions = header.createDiv({ cls: `${CLS}-condition-actions` });

    iconButton(new ExtraButtonComponent(actions))
      .setIcon('arrow-up')
      .setTooltip(strings().modals.ruleEditorMoveUp)
      .setDisabled(index === 0)
      .onClick(() => {
        this.rule.triggers = reorderConditions(
          this.rule,
          index,
          index - 1
        ).triggers;
        this.renderConditions();
        this.noteDraft();
      });
    iconButton(new ExtraButtonComponent(actions))
      .setIcon('arrow-down')
      .setTooltip(strings().modals.ruleEditorMoveDown)
      .setDisabled(index === triggers.length - 1)
      .onClick(() => {
        this.rule.triggers = reorderConditions(
          this.rule,
          index,
          index + 1
        ).triggers;
        this.renderConditions();
        this.noteDraft();
      });
    iconButton(new ExtraButtonComponent(actions))
      .setIcon('trash-2')
      .setTooltip(strings().modals.ruleEditorDeleteCondition)
      .onClick(() => {
        this.rule.triggers = removeCondition(this.rule, index).triggers;
        this.renderConditions();
        this.noteDraft();
      })
      .then(button => {
        button.extraSettingsEl.addClass(`${CLS}-delete-icon`);
      });

    const body = card.createDiv({ cls: `${CLS}-condition-body` });
    this.renderConditionBody(body, trigger);
  }

  private renderConditionBody(body: HTMLElement, trigger: Trigger): void {
    this.conditionRegistry(trigger).destroy();
    body.empty();

    const selectors = body.createDiv({ cls: `${CLS}-condition-selectors` });

    const typeField = this.createField(
      selectors,
      strings().modals.ruleEditorCriteriaType
    );
    const typeDropdown = new DropdownComponent(typeField.controlEl);
    CRITERIA_TYPES.forEach(ct => {
      typeDropdown.addOption(ct, ct);
    });
    typeDropdown.setValue(trigger.criteriaType).onChange(value => {
      applyCriteriaType(trigger, value as CriteriaType);
      this.renderConditionBody(body, trigger);
      this.noteDraft();
    });
    typeDropdown.selectEl.id = typeField.inputId;
    typeDropdown.selectEl.addClass(`${CLS}-select`);

    const operatorField = this.createField(
      selectors,
      strings().modals.ruleEditorOperator
    );
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
      const valueField = this.createField(
        valueSlot,
        strings().modals.ruleEditorValue
      );
      new TextComponent(valueField.controlEl)
        .setPlaceholder(getValuePlaceholder(trigger))
        .setValue(trigger.value)
        .onChange(value => {
          trigger.value = value;
          this.noteDraft();
        })
        .then(text => {
          const input = text.inputEl;
          input.id = valueField.inputId;
          input.addClass(`${CLS}-input`);
          this.disableTextAssistance(input);
          this.conditionRegistry(trigger).add(
            attachValueSuggester(
              this.options.app,
              input,
              trigger,
              this.options.vaultIndexCache
            )
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
      this.noteDraft();
    });

    if (trigger.criteriaType === 'properties') {
      const propertyField = this.createField(
        propertySlot,
        strings().modals.ruleEditorPropertyName
      );
      new TextComponent(propertyField.controlEl)
        .setPlaceholder(strings().modals.ruleEditorPropertyName)
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
          this.noteDraft();
        })
        .then(text => {
          const input = text.inputEl;
          input.id = propertyField.inputId;
          input.addClass(`${CLS}-input`);
          this.disableTextAssistance(input);
          this.conditionRegistry(trigger).add(
            new PropertySuggest(this.options.app, input)
          );
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

function iconButton(button: ExtraButtonComponent): ExtraButtonComponent {
  button.extraSettingsEl.setAttribute('role', 'button');
  return button;
}
