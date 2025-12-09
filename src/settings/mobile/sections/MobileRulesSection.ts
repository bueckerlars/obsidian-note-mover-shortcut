import NoteMoverShortcutPlugin from 'main';
import { MobileToggleSetting } from '../components/MobileToggleSetting';
import { MobileButtonSetting } from '../components/MobileButtonSetting';
import {
  MobileRuleItemV2,
  MobileRuleItemV1,
} from '../components/MobileRuleItem';
import { RuleEditorModal } from '../../../modals/RuleEditorModal';
import { RuleV2 } from '../../../types/RuleV2';
import { Rule } from '../../../types/Rule';
import { AdvancedSuggest } from '../../suggesters/AdvancedSuggest';
import { FolderSuggest } from '../../suggesters/FolderSuggest';
import { createError, handleError } from '../../../utils/Error';
import { SETTINGS_CONSTANTS } from '../../../config/constants';

/**
 * Mobile-optimized rules section
 */
export class MobileRulesSection {
  private ruleItems: Array<MobileRuleItemV2 | MobileRuleItemV1> = [];
  private sectionContainer: HTMLElement;

  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay?: () => void
  ) {
    this.sectionContainer = this.containerEl.createDiv({
      cls: 'mobile-section-container',
    });
  }

  render(): void {
    this.sectionContainer.empty();

    // Section heading
    const heading = this.sectionContainer.createDiv({
      cls: 'mobile-section-heading',
    });
    heading.textContent = 'Rules';
    heading.style.fontSize = '1.2em';
    heading.style.fontWeight = '600';
    heading.style.marginBottom = '12px';
    heading.style.marginTop = '16px';

    // Description
    const desc = this.sectionContainer.createDiv({
      cls: 'mobile-section-description',
    });
    desc.textContent =
      'Move files to folders based on criteria. First matching rule applies.';
    desc.style.fontSize = '0.9em';
    desc.style.color = 'var(--text-muted)';
    desc.style.marginBottom = '12px';

    // Rule V2 Toggle
    const ruleV2Toggle = new MobileToggleSetting(
      this.sectionContainer,
      'Enable Rule-V2 (beta)',
      'Advanced rule matching with multiple conditions',
      this.plugin.settings.settings.enableRuleV2 ?? false,
      async value => {
        this.plugin.settings.settings.enableRuleV2 = value;
        await this.plugin.save_settings();
        // Re-render to show correct rule list
        if (this.refreshDisplay) {
          this.refreshDisplay();
        }
      }
    );

    // Add Rule Button
    const addRuleButton = new MobileButtonSetting(
      this.sectionContainer,
      '',
      undefined,
      this.plugin.settings.settings.enableRuleV2
        ? '+ Add Rule'
        : 'Add new rule',
      async () => {
        if (this.plugin.settings.settings.enableRuleV2) {
          this.openRuleEditorModal(null);
        } else {
          this.plugin.settings.settings.rules.push({ criteria: '', path: '' });
          await this.plugin.save_settings();
          this.plugin.noteMover.updateRuleManager();
          if (this.refreshDisplay) {
            this.refreshDisplay();
          }
        }
      },
      { isPrimary: true }
    );

    // Rules List
    const rulesContainer = this.sectionContainer.createDiv({
      cls: 'mobile-rules-list-container',
    });
    rulesContainer.style.marginTop = '12px';

    if (this.plugin.settings.settings.enableRuleV2) {
      this.renderRulesV2(rulesContainer);
    } else {
      this.renderRulesV1(rulesContainer);
    }
  }

  private renderRulesV2(container: HTMLElement): void {
    if (!this.plugin.settings.settings.rulesV2) {
      this.plugin.settings.settings.rulesV2 = [];
    }

    this.ruleItems = [];

    this.plugin.settings.settings.rulesV2.forEach((rule, index) => {
      const ruleItem = new MobileRuleItemV2(container, rule, {
        onToggle: async active => {
          this.plugin.settings.settings.rulesV2![index].active = active;
          await this.plugin.save_settings();
        },
        onEdit: () => {
          this.openRuleEditorModal(index);
        },
        onDelete: async () => {
          const confirmed = confirm(
            `Delete rule "${rule.name}"?\n\nThis cannot be undone.`
          );
          if (confirmed) {
            this.plugin.settings.settings.rulesV2!.splice(index, 1);
            await this.plugin.save_settings();
            this.plugin.noteMover.updateRuleManager();
            if (this.refreshDisplay) {
              this.refreshDisplay();
            }
          }
        },
      });

      this.ruleItems.push(ruleItem);
    });
  }

  private renderRulesV1(container: HTMLElement): void {
    this.ruleItems = [];

    this.plugin.settings.settings.rules.forEach((rule, index) => {
      const ruleItem = new MobileRuleItemV1(container, rule, {
        onCriteriaChange: async value => {
          if (
            value &&
            this.plugin.settings.settings.rules.some(
              (r, i) => i !== index && r.criteria === value
            )
          ) {
            handleError(
              createError(
                'This criteria already has a folder associated with it'
              ),
              'Rules setting',
              false
            );
            return;
          }

          this.plugin.settings.settings.rules[index].criteria = value;
          await this.plugin.save_settings();
          this.plugin.noteMover.updateRuleManager();
        },
        onPathChange: async value => {
          this.plugin.settings.settings.rules[index].path = value;
          await this.plugin.save_settings();
        },
        onDelete: async () => {
          this.plugin.settings.settings.rules.splice(index, 1);
          await this.plugin.save_settings();
          this.plugin.noteMover.updateRuleManager();
          if (this.refreshDisplay) {
            this.refreshDisplay();
          }
        },
      });

      // Add AdvancedSuggest for criteria input
      const criteriaInput = ruleItem
        .getCardElement()
        .querySelector('input[type="text"]') as HTMLInputElement;
      if (criteriaInput) {
        new AdvancedSuggest(this.plugin.app, criteriaInput);
      }

      // Add FolderSuggest for path input
      const pathInputs = ruleItem
        .getCardElement()
        .querySelectorAll('input[type="text"]');
      if (pathInputs.length > 1) {
        new FolderSuggest(this.plugin.app, pathInputs[1] as HTMLInputElement);
      }

      this.ruleItems.push(ruleItem);
    });
  }

  private openRuleEditorModal(ruleIndex: number | null): void {
    const isEditMode = ruleIndex !== null;
    let rule: RuleV2;

    if (isEditMode) {
      rule = JSON.parse(
        JSON.stringify(this.plugin.settings.settings.rulesV2![ruleIndex!])
      );
    } else {
      rule = {
        name: 'New Rule',
        destination: '',
        aggregation: 'all',
        triggers: [
          {
            criteriaType: 'tag',
            operator: 'includes item',
            value: '',
          },
        ],
        active: true,
      };
    }

    const modal = new RuleEditorModal(this.plugin.app, {
      rule,
      isEditMode,
      onSave: async (updatedRule: RuleV2) => {
        if (!this.plugin.settings.settings.rulesV2) {
          this.plugin.settings.settings.rulesV2 = [];
        }

        if (isEditMode) {
          this.plugin.settings.settings.rulesV2[ruleIndex!] = updatedRule;
        } else {
          this.plugin.settings.settings.rulesV2.push(updatedRule);
        }

        await this.plugin.save_settings();
        this.plugin.noteMover.updateRuleManager();
        if (this.refreshDisplay) {
          this.refreshDisplay();
        }
      },
      onDelete: isEditMode
        ? async () => {
            this.plugin.settings.settings.rulesV2!.splice(ruleIndex!, 1);
            await this.plugin.save_settings();
            this.plugin.noteMover.updateRuleManager();
            if (this.refreshDisplay) {
              this.refreshDisplay();
            }
          }
        : undefined,
    });

    modal.open();
  }
}
