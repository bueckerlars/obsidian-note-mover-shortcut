import AdvancedNoteMoverPlugin from 'main';
import { App, ButtonComponent, Menu, Setting } from 'obsidian';
import { fill, strings } from '../../i18n/locale';
import { DragDropManager } from '../../utils/DragDropManager';
import { RuleEditorModal } from '../../modals/RuleEditorModal';
import { RuleV2 } from '../../types/RuleV2';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { toMarkdownInlineCode } from '../../utils/markdown-confirm';
import { handleError } from '../../utils/Error';
import { NoticeManager } from '../../utils/NoticeManager';
import { cloneRule } from '../cloneRule';
import { renderSetting } from '../settingDefinitions';
import { ruleSubtitle } from '../ruleSubtitle';

export class RulesSettingsSection {
  private dragDropManager: DragDropManager | null = null;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addRulesSetting(): void {
    renderSetting(this.containerEl, 'rules.heading').setTooltip(
      strings().settings.rulesIntroTail
    );
  }

  addCreateMissingFoldersSetting(): void {
    renderSetting(this.containerEl, 'rules.createFolders')
      .setTooltip(strings().settings.rulesCreateFoldersDetail)
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.pluginData.settings.createMissingDestinationFolders !==
              false
          )
          .onChange(async value => {
            this.plugin.pluginData.settings.createMissingDestinationFolders =
              value;
            await this.plugin.save_settings();
            this.plugin.advancedNoteMover.updateRuleManager();
          })
      );
  }

  addVaultReEvaluationSetting(): void {
    let reEvaluateButton: ButtonComponent | undefined;

    renderSetting(this.containerEl, 'rules.reEvaluate').addButton(btn => {
      reEvaluateButton = btn
        .setButtonText(strings().settings.rulesReEvaluateButton)
        .onClick(() => {
          if (reEvaluateButton) {
            reEvaluateButton.setDisabled(true);
            reEvaluateButton.setButtonText(
              strings().settings.rulesGeneratingPreview
            );
          }
          void (async () => {
            try {
              await this.plugin.advancedNoteMover.openVaultReEvaluationPreview();
            } catch (error) {
              handleError(
                error,
                strings().notices.errorGeneratingVaultPreviewContext,
                false
              );
              NoticeManager.error(
                fill(strings().notices.errorGeneratingPreview, {
                  message:
                    error instanceof Error ? error.message : String(error),
                })
              );
            } finally {
              if (reEvaluateButton) {
                reEvaluateButton.setDisabled(false);
                reEvaluateButton.setButtonText(
                  strings().settings.rulesReEvaluateButton
                );
              }
            }
          })();
        });
    });
  }

  addAddRuleButtonSetting(): void {
    renderSetting(this.containerEl, 'rules.add').addButton(btn =>
      btn
        .setIcon('plus')
        .setTooltip(strings().settings.rulesAddButton)
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

  async persistRulesAndSyncManager(): Promise<void> {
    await this.plugin.save_settings();
    this.plugin.advancedNoteMover.updateRuleManager();
    this.refreshDisplay();
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
    if (!this.plugin.pluginData.settings.rulesV2) {
      this.plugin.pluginData.settings.rulesV2 = [];
    }

    const rulesContainer = this.containerEl.createDiv({
      cls: 'advancedNoteMover-rules-v2-container',
    });

    // Setup drag & drop manager for V2 rules
    this.setupDragDropManagerV2(rulesContainer);

    if (this.plugin.pluginData.settings.rulesV2.length === 0) {
      renderSetting(this.containerEl, 'rules.empty');
    }

    this.plugin.pluginData.settings.rulesV2.forEach(rule => {
      const setting = new Setting(rulesContainer)
        .setName(rule.name || strings().unnamedRule)
        .setDesc(ruleSubtitle(rule))
        .addToggle(toggle =>
          toggle
            .setValue(rule.active)
            .setTooltip(
              rule.active
                ? strings().settings.rulesActive
                : strings().settings.rulesInactive
            )
            .onChange(async value => {
              const currentIndex = this.findRuleIndex(rule);
              if (currentIndex < 0) {
                return;
              }
              this.plugin.pluginData.settings.rulesV2![currentIndex].active =
                value;
              await this.persistRulesAndSyncManager();
            })
        )
        .addExtraButton(btn => {
          btn.extraSettingsEl.setAttribute('role', 'button');
          btn
            .setIcon('more-horizontal')
            .setTooltip(strings().settings.rulesActions)
            .onClick(() => {
              const rect = btn.extraSettingsEl.getBoundingClientRect();
              this.showRuleMenu(rule, {
                x: rect.left,
                y: rect.bottom,
              });
            });
        });
      this.addDragHandle(setting.settingEl);
    });
  }

  private showRuleMenu(rule: RuleV2, position: { x: number; y: number }): void {
    const menu = new Menu();
    const labels = strings().settings;
    menu.addItem(item =>
      item
        .setTitle(labels.rulesMenuEdit)
        .setIcon('pencil')
        .onClick(() => {
          const currentIndex = this.findRuleIndex(rule);
          if (currentIndex >= 0) {
            this.openRuleEditorModal(currentIndex);
          }
        })
    );
    menu.addItem(item =>
      item
        .setTitle(labels.rulesMenuDuplicate)
        .setIcon('copy')
        .onClick(() => {
          void this.duplicateRule(rule);
        })
    );
    const index = this.findRuleIndex(rule);
    const last = (this.plugin.pluginData.settings.rulesV2?.length ?? 0) - 1;
    menu.addItem(item =>
      item
        .setTitle(labels.rulesMenuUp)
        .setIcon('chevron-up')
        .setDisabled(index <= 0)
        .onClick(() => {
          void this.moveRule(rule, -1);
        })
    );
    menu.addItem(item =>
      item
        .setTitle(labels.rulesMenuDown)
        .setIcon('chevron-down')
        .setDisabled(index < 0 || index >= last)
        .onClick(() => {
          void this.moveRule(rule, 1);
        })
    );
    menu.addItem(item =>
      item
        .setTitle(labels.rulesMenuDelete)
        .setIcon('trash')
        .onClick(() => {
          void this.deleteRule(rule);
        })
    );
    menu.showAtPosition(position);
  }

  private async duplicateRule(rule: RuleV2): Promise<void> {
    if (!this.plugin.pluginData.settings.rulesV2) {
      this.plugin.pluginData.settings.rulesV2 = [];
    }
    const currentIndex = this.findRuleIndex(rule);
    if (currentIndex < 0) {
      return;
    }
    const clonedRule = cloneRule(rule, this.plugin.pluginData.settings.rulesV2);
    this.plugin.pluginData.settings.rulesV2.splice(
      currentIndex + 1,
      0,
      clonedRule
    );
    await this.persistRulesAndSyncManager();
  }

  private async moveRule(rule: RuleV2, direction: -1 | 1): Promise<void> {
    const index = this.findRuleIndex(rule);
    const rules = this.plugin.pluginData.settings.rulesV2 ?? [];
    const next = index + direction;
    if (index < 0 || next < 0 || next >= rules.length) {
      return;
    }
    this.reorderRulesV2(index, next);
    await this.persistRulesAndSyncManager();
  }

  private async deleteRule(rule: RuleV2): Promise<void> {
    const currentIndex = this.findRuleIndex(rule);
    if (currentIndex < 0) {
      return;
    }
    const ruleLabel = toMarkdownInlineCode(rule.name || strings().unnamedRule);
    const confirmed = await ConfirmModal.show(this.app, {
      title: strings().modals.ruleEditorDeleteTitle,
      message: fill(strings().modals.confirmDeleteRule, {
        rule: ruleLabel,
      }),
      confirmText: strings().common.delete,
      cancelText: strings().common.cancel,
      danger: true,
    });
    if (confirmed) {
      this.plugin.pluginData.settings.rulesV2!.splice(currentIndex, 1);
      await this.persistRulesAndSyncManager();
    }
  }

  private addDragHandle(settingEl: HTMLElement): void {
    const handle = DragDropManager.createDragHandle();
    const handleContainer = createDiv({
      cls: 'advancedNoteMover-drag-handle-container',
    });
    handleContainer.appendChild(handle);
    settingEl.insertBefore(handleContainer, settingEl.firstChild);
    settingEl.classList.add('advancedNoteMover-with-drag-handle');
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
      onMove: (index, direction) => {
        const rule = this.plugin.pluginData.settings.rulesV2?.[index];
        if (!rule) return;
        void this.moveRule(rule, direction);
      },
      onSave: async () => {
        await this.persistRulesAndSyncManager();
      },
      itemSelector: '.setting-item',
      handleSelector: '.advancedNoteMover-drag-handle',
    });
  }

  /**
   * Reorder RuleV2 rules
   */
  private reorderRulesV2(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || !this.plugin.pluginData.settings.rulesV2)
      return;

    const rules = this.plugin.pluginData.settings.rulesV2;
    const [movedRule] = rules.splice(fromIndex, 1);
    rules.splice(toIndex, 0, movedRule);
  }

  /** Resolve current index by object identity so actions stay correct after reorder. */
  private findRuleIndex(rule: RuleV2): number {
    return this.plugin.pluginData.settings.rulesV2?.indexOf(rule) ?? -1;
  }

  /**
   * Open RuleEditorModal for creating or editing a rule
   * @param ruleIndex - Index of rule to edit, or null to create new rule
   */
  openRuleEditorModal(ruleIndex: number | null): void {
    const isEditMode = ruleIndex !== null;
    let rule: RuleV2;

    if (isEditMode) {
      // Edit mode: clone existing rule
      rule = structuredClone(
        this.plugin.pluginData.settings.rulesV2![ruleIndex]
      );
    } else {
      // Create mode: new rule
      rule = {
        name: strings().settings.rulesNewName,
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
        if (!this.plugin.pluginData.settings.rulesV2) {
          this.plugin.pluginData.settings.rulesV2 = [];
        }

        if (isEditMode) {
          // Update existing rule
          this.plugin.pluginData.settings.rulesV2[ruleIndex] = updatedRule;
        } else {
          // Add new rule
          this.plugin.pluginData.settings.rulesV2.push(updatedRule);
        }

        await this.persistRulesAndSyncManager();
      },
      onDelete: isEditMode
        ? async () => {
            this.plugin.pluginData.settings.rulesV2!.splice(ruleIndex, 1);
            await this.persistRulesAndSyncManager();
          }
        : undefined,
      vaultIndexCache: this.plugin.vaultIndexCache,
    });

    modal.open();
  }
}
