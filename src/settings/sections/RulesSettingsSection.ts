import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { FolderSuggest } from '../suggesters/FolderSuggest';
import { AdvancedSuggest } from '../suggesters/AdvancedSuggest';
import { createError, handleError } from '../../utils/Error';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { DragDropManager } from '../../utils/DragDropManager';
import { RuleEditorModal } from '../../modals/RuleEditorModal';
import { RuleV2 } from '../../types/RuleV2';
import { MobileUtils } from '../../utils/MobileUtils';

export class RulesSettingsSection {
  private dragDropManager: DragDropManager | null = null;
  private advancedSuggestInstances: AdvancedSuggest[] = [];

  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addRulesSetting(): void {
    new Setting(this.containerEl).setName('Rules').setHeading();

    const descUseRules = document.createDocumentFragment();
    descUseRules.append(
      'The NoteMover will move files to the folder associated with the specified criteria.',
      document.createElement('br'),
      'Criteria can be tags, filenames, paths, content, properties, or dates. If multiple rules match, the first one will be applied.'
    );

    new Setting(this.containerEl).setDesc(descUseRules);

    // Feature flag toggle for Rule V2
    const ruleV2Desc = document.createDocumentFragment();
    ruleV2Desc.append(
      'Enable the new Rule V2 system (beta). This provides more flexible rule matching with multiple conditions and logical operators.',
      document.createElement('br'),
      '⚠️ Beta feature: Rule V2 replaces the existing rule system when enabled. Your existing rules will be migrated automatically.'
    );

    new Setting(this.containerEl)
      .setName('Enable Rule-V2 (beta)')
      .setDesc(ruleV2Desc)
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.settings.enableRuleV2 ?? false)
          .onChange(async value => {
            this.plugin.settings.settings.enableRuleV2 = value;
            await this.plugin.save_settings();
            this.refreshDisplay();
          })
      );
  }

  addAddRuleButtonSetting(): void {
    // Check if RuleV2 is enabled
    if (this.plugin.settings.settings.enableRuleV2) {
      this.addAddRuleV2ButtonSetting();
    } else {
      this.addAddRuleV1ButtonSetting();
    }
  }

  private addAddRuleV1ButtonSetting(): void {
    new Setting(this.containerEl).addButton(btn =>
      btn
        .setButtonText('Add new rule')
        .setCta()
        .onClick(async () => {
          this.plugin.settings.settings.rules.push({ criteria: '', path: '' });
          await this.plugin.save_settings();
          // Update RuleManager
          this.plugin.noteMover.updateRuleManager();
          this.refreshDisplay();
        })
    );
  }

  private addAddRuleV2ButtonSetting(): void {
    new Setting(this.containerEl).addButton(btn =>
      btn
        .setButtonText('+ Add Rule')
        .setCta()
        .onClick(() => {
          this.openRuleEditorModal(null);
        })
    );
  }

  addRulesArray(): void {
    // Check if RuleV2 is enabled
    if (this.plugin.settings.settings.enableRuleV2) {
      this.addRulesV2Array();
    } else {
      this.addRulesV1Array();
    }
  }

  private addRulesV1Array(): void {
    // Clean up existing AdvancedSuggest instances before creating new ones
    this.cleanupAdvancedSuggestInstances();

    const isMobile = MobileUtils.isMobile();

    // Create a container for rules with drag & drop
    const rulesContainer = document.createElement('div');
    rulesContainer.className = 'noteMover-rules-container';
    if (isMobile) {
      rulesContainer.addClass('noteMover-mobile-rules-container');
    }
    this.containerEl.appendChild(rulesContainer);

    // Setup drag & drop manager
    this.setupDragDropManager(rulesContainer);

    this.plugin.settings.settings.rules.forEach((rule, index) => {
      const s = new Setting(rulesContainer)
        .addSearch(cb => {
          // AdvancedSuggest instead of TagSuggest
          const advancedSuggest = new AdvancedSuggest(this.app, cb.inputEl);
          // Track the instance for cleanup
          this.advancedSuggestInstances.push(advancedSuggest);
          cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.CRITERIA)
            .setValue(rule.criteria)
            .onChange(async value => {
              if (
                value &&
                this.plugin.settings.settings.rules.some(
                  rule => rule.criteria === value
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

              // Save Setting
              this.plugin.settings.settings.rules[index].criteria = value;
              await this.plugin.save_settings();
              // Update RuleManager
              this.plugin.noteMover.updateRuleManager();
            });
          // @ts-ignore
          cb.containerEl.addClass('noteMover-search');
        })
        .addSearch(cb => {
          new FolderSuggest(this.app, cb.inputEl);
          cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.PATH)
            .setValue(rule.path)
            .onChange(async value => {
              this.plugin.settings.settings.rules[index].path = value;
              await this.plugin.save_settings();
            });
          // @ts-ignore
          cb.containerEl.addClass('noteMover-search');
        })
        .addExtraButton(btn =>
          btn.setIcon('cross').onClick(async () => {
            this.plugin.settings.settings.rules.splice(index, 1);
            await this.plugin.save_settings();
            // Update RuleManager
            this.plugin.noteMover.updateRuleManager();
            this.refreshDisplay();
          })
        );

      // Add drag handle to the setting
      this.addDragHandle(s.settingEl, index);
      s.infoEl.remove();

      // Add mobile optimization classes
      if (isMobile) {
        s.settingEl.addClass('noteMover-mobile-rule-item');
        const controlEl = s.settingEl.querySelector('.setting-item-control');
        if (controlEl) {
          (controlEl as HTMLElement).addClass('noteMover-mobile-rule-controls');
        }
      }
    });
  }

  moveRule(index: number, direction: number) {
    const rules = this.plugin.settings.settings.rules;
    const newIndex = Math.max(0, Math.min(rules.length - 1, index + direction));
    [rules[index], rules[newIndex]] = [rules[newIndex], rules[index]];
    this.plugin.save_settings();
    this.refreshDisplay();
  }

  private setupDragDropManager(container: HTMLElement): void {
    // Clean up existing manager
    if (this.dragDropManager) {
      this.dragDropManager.destroy();
    }

    this.dragDropManager = new DragDropManager(container, {
      onReorder: (fromIndex: number, toIndex: number) => {
        this.reorderRules(fromIndex, toIndex);
      },
      onSave: async () => {
        await this.plugin.save_settings();
        this.plugin.noteMover.updateRuleManager();
        // Refresh display after settings are fully saved
        this.refreshDisplay();
      },
      itemSelector: '.setting-item',
      handleSelector: '.noteMover-drag-handle',
    });
  }

  private addDragHandle(settingEl: HTMLElement, index: number): void {
    const handle = DragDropManager.createDragHandle();
    const handleContainer = document.createElement('div');
    handleContainer.className = 'noteMover-drag-handle-container';
    handleContainer.appendChild(handle);

    // Insert handle at the beginning of the setting
    settingEl.insertBefore(handleContainer, settingEl.firstChild);
    settingEl.classList.add('noteMover-with-drag-handle');
  }

  private reorderRules(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    const rules = this.plugin.settings.settings.rules;
    const [movedRule] = rules.splice(fromIndex, 1);
    rules.splice(toIndex, 0, movedRule);

    // Note: refreshDisplay() will be called by the onSave callback after settings are saved
  }

  private get app(): App {
    return this.plugin.app;
  }

  /**
   * Clean up AdvancedSuggest instances to prevent memory leaks
   */
  private cleanupAdvancedSuggestInstances(): void {
    this.advancedSuggestInstances.forEach(instance => {
      instance.destroy();
    });
    this.advancedSuggestInstances = [];
  }

  /**
   * Public cleanup method to be called when the section is destroyed
   */
  public cleanup(): void {
    this.cleanupAdvancedSuggestInstances();
    if (this.dragDropManager) {
      this.dragDropManager.destroy();
      this.dragDropManager = null;
    }
  }

  /**
   * Renders RuleV2 list UI
   */
  private addRulesV2Array(): void {
    // Ensure rulesV2 array exists
    if (!this.plugin.settings.settings.rulesV2) {
      this.plugin.settings.settings.rulesV2 = [];
    }

    const isMobile = MobileUtils.isMobile();

    // Create a container for rules with drag & drop
    const rulesContainer = document.createElement('div');
    rulesContainer.className = 'noteMover-rules-v2-container';
    if (isMobile) {
      rulesContainer.addClass('noteMover-mobile-rules-container');
    }
    this.containerEl.appendChild(rulesContainer);

    // Setup drag & drop manager for V2 rules
    this.setupDragDropManagerV2(rulesContainer);

    this.plugin.settings.settings.rulesV2.forEach((rule, index) => {
      const s = new Setting(rulesContainer);

      // Remove default info element
      s.infoEl.remove();

      // Create custom layout container
      const customContainer = s.settingEl.createDiv({
        cls: 'noteMover-rule-v2-custom-container',
      });

      // Add mobile class if on mobile
      if (isMobile) {
        customContainer.addClass('noteMover-mobile-rule-container');
      }

      // Rule name display (left side)
      const nameEl = customContainer.createDiv({
        cls: 'noteMover-rule-v2-name',
      });
      nameEl.textContent = rule.name || 'Unnamed Rule';

      // Actions container (right side)
      const actionsContainer = customContainer.createDiv({
        cls: 'noteMover-rule-v2-actions',
      });

      // Add mobile class if on mobile
      if (isMobile) {
        actionsContainer.addClass('noteMover-mobile-rule-actions');
      }

      // Add delete button to actions container
      s.addExtraButton(btn =>
        btn
          .setIcon('trash')
          .setTooltip('Delete rule')
          .onClick(async () => {
            // Show confirmation dialog
            const confirmed = confirm(
              `Are you sure you want to delete the rule "${rule.name}"?\n\nThis action cannot be undone.`
            );
            if (confirmed) {
              this.plugin.settings.settings.rulesV2!.splice(index, 1);
              await this.plugin.save_settings();
              this.refreshDisplay();
            }
          })
      );

      // Add edit button to actions container
      s.addExtraButton(btn =>
        btn
          .setIcon('pencil')
          .setTooltip('Edit rule')
          .onClick(() => {
            this.openRuleEditorModal(index);
          })
      );

      // Add active toggle to actions container
      s.addToggle(toggle =>
        toggle
          .setValue(rule.active)
          .setTooltip(rule.active ? 'Rule is active' : 'Rule is inactive')
          .onChange(async value => {
            this.plugin.settings.settings.rulesV2![index].active = value;
            await this.plugin.save_settings();
          })
      );

      // Move controls to actions container
      const controlEl = s.settingEl.querySelector('.setting-item-control');
      if (controlEl) {
        actionsContainer.appendChild(controlEl);
      }

      // Add drag handle to actions container (rightmost position)
      const handleContainer = actionsContainer.createDiv({
        cls: 'noteMover-drag-handle-container',
      });
      const handle = DragDropManager.createDragHandle();
      handleContainer.appendChild(handle);
    });
  }

  /**
   * Setup drag & drop manager for RuleV2
   */
  private setupDragDropManagerV2(container: HTMLElement): void {
    // Clean up existing manager
    if (this.dragDropManager) {
      this.dragDropManager.destroy();
    }

    this.dragDropManager = new DragDropManager(container, {
      onReorder: (fromIndex: number, toIndex: number) => {
        this.reorderRulesV2(fromIndex, toIndex);
      },
      onSave: async () => {
        await this.plugin.save_settings();
        this.plugin.noteMover.updateRuleManager();
        this.refreshDisplay();
      },
      itemSelector: '.setting-item',
      handleSelector: '.noteMover-drag-handle',
    });
  }

  /**
   * Reorder RuleV2 rules
   */
  private reorderRulesV2(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || !this.plugin.settings.settings.rulesV2) return;

    const rules = this.plugin.settings.settings.rulesV2;
    const [movedRule] = rules.splice(fromIndex, 1);
    rules.splice(toIndex, 0, movedRule);
  }

  /**
   * Open RuleEditorModal for creating or editing a rule
   * @param ruleIndex - Index of rule to edit, or null to create new rule
   */
  private openRuleEditorModal(ruleIndex: number | null): void {
    const isEditMode = ruleIndex !== null;
    let rule: RuleV2;

    if (isEditMode) {
      // Edit mode: clone existing rule
      rule = JSON.parse(
        JSON.stringify(this.plugin.settings.settings.rulesV2![ruleIndex])
      );
    } else {
      // Create mode: new rule
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

    const modal = new RuleEditorModal(this.app, {
      rule,
      isEditMode,
      onSave: async (updatedRule: RuleV2) => {
        if (!this.plugin.settings.settings.rulesV2) {
          this.plugin.settings.settings.rulesV2 = [];
        }

        if (isEditMode) {
          // Update existing rule
          this.plugin.settings.settings.rulesV2[ruleIndex!] = updatedRule;
        } else {
          // Add new rule
          this.plugin.settings.settings.rulesV2.push(updatedRule);
        }

        await this.plugin.save_settings();
        this.refreshDisplay();
      },
      onDelete: isEditMode
        ? async () => {
            this.plugin.settings.settings.rulesV2!.splice(ruleIndex!, 1);
            await this.plugin.save_settings();
            this.refreshDisplay();
          }
        : undefined,
    });

    modal.open();
  }
}
