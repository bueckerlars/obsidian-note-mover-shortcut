import AdvancedNoteMoverPlugin from 'main';
import { App, Setting } from 'obsidian';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { DragDropManager } from '../../utils/DragDropManager';
import { RuleEditorModal } from '../../modals/RuleEditorModal';
import { RuleV2 } from '../../types/RuleV2';
import { MobileUtils } from '../../utils/MobileUtils';
import { ConfirmModal } from '../../modals/ConfirmModal';

function escapeHtmlForConfirm(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class RulesSettingsSection {
  private dragDropManager: DragDropManager | null = null;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addRulesSetting(): void {
    new Setting(this.containerEl).setName('Rules').setHeading();

    const descUseRules = document.createDocumentFragment();
    descUseRules.append(
      'The Advanced Note Mover will move files to the folder associated with the specified criteria.',
      document.createElement('br'),
      'Criteria can be tags, filenames, paths, content, properties, or dates. If multiple rules match, the first one will be applied.'
    );

    new Setting(this.containerEl).setDesc(descUseRules);
  }

  addAddRuleButtonSetting(): void {
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
    this.addRulesV2Array();
  }

  private get app(): App {
    return this.plugin.app;
  }

  /**
   * Public cleanup method to be called when the section is destroyed
   */
  public cleanup(): void {
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
    rulesContainer.className = 'advancedNoteMover-rules-v2-container';
    if (isMobile) {
      rulesContainer.addClass('advancedNoteMover-mobile-rules-container');
    }
    this.containerEl.appendChild(rulesContainer);

    // Setup drag & drop manager for V2 rules
    this.setupDragDropManagerV2(rulesContainer);

    if (this.plugin.settings.settings.rulesV2.length === 0) {
      this.containerEl.createEl('p', {
        cls: 'advancedNoteMover-settings-hint',
        text: 'No rules are configured. Add one using the control below.',
      });
    }

    this.plugin.settings.settings.rulesV2.forEach((rule, index) => {
      const s = new Setting(rulesContainer);

      // Remove default info element
      s.infoEl.remove();

      // Create custom layout container
      const customContainer = s.settingEl.createDiv({
        cls: 'advancedNoteMover-rule-v2-custom-container',
      });

      // Add mobile class if on mobile
      if (isMobile) {
        customContainer.addClass('advancedNoteMover-mobile-rule-container');
      }

      // Rule name display (left side)
      const nameEl = customContainer.createDiv({
        cls: 'advancedNoteMover-rule-v2-name',
      });
      nameEl.textContent = rule.name || 'Unnamed Rule';

      // Actions container (right side)
      const actionsContainer = customContainer.createDiv({
        cls: 'advancedNoteMover-rule-v2-actions',
      });

      // Add mobile class if on mobile
      if (isMobile) {
        actionsContainer.addClass('advancedNoteMover-mobile-rule-actions');
      }

      // Add delete button to actions container
      s.addExtraButton(btn =>
        btn
          .setIcon('trash')
          .setTooltip('Delete rule')
          .onClick(async () => {
            const safe = escapeHtmlForConfirm(rule.name || 'Unnamed Rule');
            const confirmed = await ConfirmModal.show(this.app, {
              title: SETTINGS_CONSTANTS.UI_TEXTS.DELETE_RULE_TITLE,
              message: `Are you sure you want to delete the rule <strong>"${safe}"</strong>?<br/><br/>This action cannot be undone.`,
              confirmText: SETTINGS_CONSTANTS.UI_TEXTS.DELETE_RULE_CONFIRM,
              cancelText: 'Cancel',
              danger: true,
            });
            if (confirmed) {
              this.plugin.settings.settings.rulesV2!.splice(index, 1);
              await this.plugin.save_settings();
              this.refreshDisplay();
            }
          })
      );

      // Add clone button to actions container
      s.addExtraButton(btn =>
        btn
          .setIcon('copy')
          .setTooltip('Clone rule')
          .onClick(async () => {
            if (!this.plugin.settings.settings.rulesV2) {
              this.plugin.settings.settings.rulesV2 = [];
            }
            const clonedRule = JSON.parse(JSON.stringify(rule)) as RuleV2;
            const baseName = rule.name?.trim() || 'Unnamed Rule';
            clonedRule.name = `${baseName} (copy)`;
            this.plugin.settings.settings.rulesV2.splice(
              index + 1,
              0,
              clonedRule
            );
            await this.plugin.save_settings();
            this.plugin.advancedNoteMover.updateRuleManager();
            this.refreshDisplay();
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
        cls: 'advancedNoteMover-drag-handle-container',
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
        this.plugin.advancedNoteMover.updateRuleManager();
        this.refreshDisplay();
      },
      itemSelector: '.setting-item',
      handleSelector: '.advancedNoteMover-drag-handle',
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
      vaultIndexCache: this.plugin.vaultIndexCache,
    });

    modal.open();
  }
}
