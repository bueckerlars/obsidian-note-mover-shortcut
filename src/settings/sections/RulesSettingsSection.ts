import AdvancedNoteMoverPlugin from 'main';
import { App, Menu, Setting, setIcon } from 'obsidian';
import { fill, strings } from '../../i18n/locale';
import {
  buildRuleSummary,
  summaryText,
  type SummarySegment,
} from '../../domain/rules/ruleSummary';
import { presetRule, type RulePreset } from '../../domain/rules/rulePresets';
import { viewClearTimeout, viewTimeout } from '../../utils/viewTimers';
import { DragDropManager } from '../../utils/DragDropManager';
import { RuleEditorModal } from '../../modals/RuleEditorModal';
import { addMenuHint } from '../../utils/menuHint';
import { RuleV2 } from '../../types/RuleV2';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { toMarkdownInlineCode } from '../../utils/markdown-confirm';
import { cloneRule } from '../cloneRule';
import {
  addPhoneAddRow,
  addPlusIcon,
  createSettingGroup,
} from '../settingGroup';

/** Survives re-renders of the tab: the filter text and the last move to announce. */
export interface RulesUiState {
  query: string;
  moved: { index: number; total: number } | null;
}

const MOVED_HINT_MS = 2000;

export class RulesSettingsSection {
  private dragDropManager: DragDropManager | null = null;
  private listEl: HTMLElement;
  private readonly rows: { el: HTMLElement; text: string }[] = [];
  private hintTimer: number | null = null;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void,
    private filterState: RulesUiState = { query: '', moved: null }
  ) {
    this.listEl = containerEl;
  }

  /** Group with heading-row search and add button, then the current rule list. */
  render(): void {
    const labels = strings().settings;
    const group = createSettingGroup(this.containerEl, {
      heading: labels.headingsRules,
      description: labels.rulesGroupDesc,
    });
    if ((this.plugin.pluginData.settings.rulesV2 ?? []).length > 0) {
      group.addSearch(search => {
        search
          .setPlaceholder(labels.rulesFilterPlaceholder)
          .setValue(this.filterState.query)
          .onChange(value => {
            this.filterState.query = value;
            this.applyFilter();
          });
        search.inputEl.setAttr('aria-label', labels.rulesFilterPlaceholder);
      });
    }
    group.addButton(button => {
      button
        .setButtonText(labels.rulesAddButton)
        .onClick(() => this.openRuleEditorModal(null));
      addPlusIcon(button);
    });
    this.listEl = group.listEl;
    this.addRulesV2Array();
    this.applyFilter();
  }

  private applyFilter(): void {
    const query = this.filterState.query.trim().toLowerCase();
    for (const row of this.rows) {
      row.el.toggleClass(
        'advancedNoteMover-hidden',
        query !== '' && !row.text.includes(query)
      );
    }
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
    if (this.hintTimer !== null) {
      viewClearTimeout(this.hintTimer);
      this.hintTimer = null;
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

    const rulesContainer = this.listEl;
    rulesContainer.addClass('advancedNoteMover-rules-v2-container');

    // Setup drag & drop manager for V2 rules
    this.setupDragDropManagerV2(rulesContainer);

    const rules = this.plugin.pluginData.settings.rulesV2;
    if (rules.length === 0) {
      this.renderEmptyState(rulesContainer);
      return;
    }
    rules.forEach(rule => this.renderRuleRow(rulesContainer, rule));
    addPhoneAddRow(rulesContainer, strings().settings.rulesAddButton, () =>
      this.openRuleEditorModal(null)
    );
    this.applyMoveFeedback(rulesContainer);
  }

  private renderEmptyState(container: HTMLElement): void {
    const labels = strings().settings;
    const empty = container.createDiv({ cls: 'advancedNoteMover-empty' });
    setIcon(
      empty.createSpan({ cls: 'advancedNoteMover-empty-icon' }),
      'folder-input'
    );
    empty.createSpan({ text: labels.rulesEmptyText });
    const presets: [RulePreset, string, string, string?][] = [
      ['tag', 'tag', labels.rulesPresetTag, labels.rulesPresetTagDesc],
      [
        'property',
        'text',
        labels.rulesPresetProperty,
        labels.rulesPresetPropertyDesc,
      ],
      ['date', 'calendar', labels.rulesPresetDate, labels.rulesPresetDateDesc],
      ['blank', 'plus', labels.rulesPresetBlank],
    ];
    for (const [preset, icon, name, desc] of presets) {
      const setting = new Setting(container).setName(name);
      if (desc) setting.setDesc(desc);
      const el = setting.settingEl;
      el.addClass('advancedNoteMover-add-row');
      el.setAttrs({ role: 'button', tabindex: '0' });
      setIcon(el.createSpan({ cls: 'advancedNoteMover-add-row-icon' }), icon);
      el.prepend(el.querySelector('.advancedNoteMover-add-row-icon') as Node);
      const open = () => this.openRuleEditorModal(null, presetRule(preset, ''));
      el.addEventListener('click', open);
      el.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    }
  }

  private renderRuleRow(container: HTMLElement, rule: RuleV2): void {
    const labels = strings().settings;
    const setting = new Setting(container).setName(
      rule.name || strings().unnamedRule
    );
    const { settingEl } = setting;
    settingEl.addClass('advancedNoteMover-rule-row');
    if (!rule.active) settingEl.addClass('advancedNoteMover-dim');

    const skipped = (
      this.plugin.conflictSkipCacheManager?.getEntries() ?? []
    ).filter(entry => entry.ruleName === rule.name).length;
    if (skipped > 0) {
      const pill = setting.nameEl.createSpan({
        cls: 'advancedNoteMover-pill is-warning',
      });
      setIcon(
        pill.createSpan({ cls: 'advancedNoteMover-pill-icon' }),
        'alert-triangle'
      );
      pill.createSpan({
        text: fill(labels.rulesSkippedPill, { count: skipped }),
      });
    }

    const segments = buildRuleSummary(rule, strings().ruleSummary);
    this.renderSummary(setting.descEl, segments);

    setting
      .addToggle(toggle =>
        toggle
          .setValue(rule.active)
          .setTooltip(rule.active ? labels.rulesActive : labels.rulesInactive)
          .onChange(async value => {
            const currentIndex = this.findRuleIndex(rule);
            if (currentIndex < 0) return;
            this.plugin.pluginData.settings.rulesV2![currentIndex].active =
              value;
            await this.persistRulesAndSyncManager();
          })
      )
      .addExtraButton(btn => {
        btn.extraSettingsEl.setAttribute('role', 'button');
        btn
          .setIcon('more-horizontal')
          .setTooltip(labels.rulesActions)
          .onClick(() => {
            const rect = btn.extraSettingsEl.getBoundingClientRect();
            this.showRuleMenu(rule, { x: rect.left, y: rect.bottom });
          });
      });
    this.addDragHandle(settingEl);

    // The row opens the editor; the controls keep their own clicks.
    const open = () => {
      const currentIndex = this.findRuleIndex(rule);
      if (currentIndex >= 0) this.openRuleEditorModal(currentIndex);
    };
    settingEl.addEventListener('click', event => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          '.checkbox-container, .clickable-icon, .advancedNoteMover-drag-handle-container'
        )
      ) {
        return;
      }
      open();
    });
    setting.infoEl.setAttrs({ role: 'button', tabindex: '0' });
    setting.infoEl.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });

    this.rows.push({
      el: settingEl,
      text: `${rule.name} ${summaryText(segments)}`.toLowerCase(),
    });
  }

  private renderSummary(el: HTMLElement, segments: SummarySegment[]): void {
    const line = el.createDiv({ cls: 'advancedNoteMover-summary' });
    for (const segment of segments) {
      if (segment.kind === 'icon') {
        setIcon(
          line.createSpan({ cls: 'advancedNoteMover-summary-icon' }),
          segment.icon
        );
      } else if (segment.kind === 'arrow') {
        // Phone: the destination starts a second line.
        line.createSpan({ cls: 'advancedNoteMover-summary-break' });
        setIcon(
          line.createSpan({ cls: 'advancedNoteMover-summary-icon' }),
          'arrow-right'
        );
      } else {
        line.createSpan({
          cls: `advancedNoteMover-summary-${segment.kind}`,
          text: segment.text,
        });
      }
    }
  }

  /** After a move: keep focus on the moved handle, announce it and show the hint briefly. */
  private applyMoveFeedback(container: HTMLElement): void {
    const moved = this.filterState.moved;
    if (!moved) return;
    this.filterState.moved = null;
    const message = fill(strings().settings.rulesMoved, {
      position: moved.index + 1,
      total: moved.total,
    });
    const row = container.querySelectorAll('.setting-item')[moved.index];
    if (!row) return;
    row.querySelector<HTMLElement>('.advancedNoteMover-drag-handle')?.focus();
    const hint = row
      .querySelector('.setting-item-control')
      ?.createSpan({ cls: 'advancedNoteMover-moved-hint', text: message });
    hint?.parentElement?.prepend(hint);
    const live = container.createDiv({
      cls: 'advancedNoteMover-sr-only',
      attr: { 'aria-live': 'polite', role: 'status' },
    });
    this.hintTimer = viewTimeout(() => {
      live.textContent = message;
      this.hintTimer = viewTimeout(() => {
        hint?.remove();
        live.remove();
        this.hintTimer = null;
      }, MOVED_HINT_MS);
    }, 50);
  }

  private showRuleMenu(rule: RuleV2, position: { x: number; y: number }): void {
    const menu = new Menu();
    const labels = strings().settings;
    const index = this.findRuleIndex(rule);
    const last = (this.plugin.pluginData.settings.rulesV2?.length ?? 0) - 1;
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
        .setTitle(labels.rulesMenuPreview)
        .setIcon('eye')
        .onClick(() => {
          this.plugin.advancedNoteMover.openVaultMovePreview(rule.name);
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
    menu.addSeparator();
    menu.addItem(item => {
      item
        .setTitle(labels.rulesMenuUp)
        .setIcon('arrow-up')
        .setDisabled(index <= 0)
        .onClick(() => {
          void this.moveRule(rule, -1);
        });
      addMenuHint(item, 'Alt ↑');
    });
    menu.addItem(item => {
      item
        .setTitle(labels.rulesMenuDown)
        .setIcon('arrow-down')
        .setDisabled(index < 0 || index >= last)
        .onClick(() => {
          void this.moveRule(rule, 1);
        });
      addMenuHint(item, 'Alt ↓');
    });
    menu.addSeparator();
    menu.addItem(item =>
      item
        .setTitle(labels.rulesMenuDelete)
        .setIcon('trash-2')
        .setWarning(true)
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
      onReorder: (fromIndex: number, dropSlot: number) => {
        // A drop slot counts the dragged row; after removing it, later slots shift up.
        this.reorderRulesV2(
          fromIndex,
          dropSlot > fromIndex ? dropSlot - 1 : dropSlot
        );
      },
      onMove: (index, direction) => {
        const rule = this.plugin.pluginData.settings.rulesV2?.[index];
        if (!rule) return;
        void this.moveRule(rule, direction);
      },
      onSave: async () => {
        await this.persistRulesAndSyncManager();
      },
      itemSelector: '.setting-item:not(.advancedNoteMover-phone-only)',
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
    this.filterState.moved = { index: toIndex, total: rules.length };
  }

  /** Resolve current index by object identity so actions stay correct after reorder. */
  private findRuleIndex(rule: RuleV2): number {
    return this.plugin.pluginData.settings.rulesV2?.indexOf(rule) ?? -1;
  }

  /**
   * Open RuleEditorModal for creating or editing a rule
   * @param ruleIndex - Index of rule to edit, or null to create new rule
   * @param initial - Prefilled rule for a new one
   */
  openRuleEditorModal(ruleIndex: number | null, initial?: RuleV2): void {
    const isEditMode = ruleIndex !== null;
    let rule: RuleV2;

    if (isEditMode) {
      // Edit mode: clone existing rule
      rule = structuredClone(
        this.plugin.pluginData.settings.rulesV2![ruleIndex]
      );
    } else {
      rule = initial ?? presetRule('tag', '');
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
      createFoldersByDefault:
        this.plugin.pluginData.settings.createMissingDestinationFolders ?? true,
      onOpenPreview: isEditMode
        ? () => this.plugin.advancedNoteMover.openVaultMovePreview(rule.name)
        : undefined,
    });

    modal.open();
  }
}
