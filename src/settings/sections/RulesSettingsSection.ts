import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { FolderSuggest } from '../suggesters/FolderSuggest';
import { createError, handleError } from 'src/utils/Error';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { DragDropManager } from '../../utils/DragDropManager';

export class RulesSettingsSection {
  private dragDropManager: DragDropManager | null = null;

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

    new Setting(this.containerEl)
      .setName('Rules description')
      .setDesc(descUseRules);
  }

  addAddRuleButtonSetting(): void {
    new Setting(this.containerEl).addButton(btn =>
      btn
        .setButtonText('Add new rule')
        .setCta()
        .onClick(async () => {
          this.plugin.settings.rules.push({ criteria: '', path: '' });
          await this.plugin.save_settings();
          // Update RuleManager
          this.plugin.noteMover.updateRuleManager();
          this.refreshDisplay();
        })
    );
  }

  addRulesArray(): void {
    // Create a container for rules with drag & drop
    const rulesContainer = document.createElement('div');
    rulesContainer.className = 'rules-container';
    this.containerEl.appendChild(rulesContainer);

    // Setup drag & drop manager
    this.setupDragDropManager(rulesContainer);

    this.plugin.settings.rules.forEach((rule, index) => {
      const s = new Setting(rulesContainer)
        .addSearch(cb => {
          // AdvancedSuggest instead of TagSuggest
          new (require('../suggesters/AdvancedSuggest').AdvancedSuggest)(
            this.app,
            cb.inputEl
          );
          cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.CRITERIA)
            .setValue(rule.criteria)
            .onChange(async value => {
              if (
                value &&
                this.plugin.settings.rules.some(rule => rule.criteria === value)
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
              this.plugin.settings.rules[index].criteria = value;
              await this.plugin.save_settings();
              // Update RuleManager
              this.plugin.noteMover.updateRuleManager();
            });
          // @ts-ignore
          cb.containerEl.addClass('note_mover_search');
        })
        .addSearch(cb => {
          new FolderSuggest(this.app, cb.inputEl);
          cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.PATH)
            .setValue(rule.path)
            .onChange(async value => {
              this.plugin.settings.rules[index].path = value;
              await this.plugin.save_settings();
            });
          // @ts-ignore
          cb.containerEl.addClass('note_mover_search');
        })
        .addExtraButton(btn =>
          btn.setIcon('cross').onClick(async () => {
            this.plugin.settings.rules.splice(index, 1);
            await this.plugin.save_settings();
            // Update RuleManager
            this.plugin.noteMover.updateRuleManager();
            this.refreshDisplay();
          })
        );

      // Add drag handle to the setting
      this.addDragHandle(s.settingEl, index);
      s.infoEl.remove();
    });
  }

  moveRule(index: number, direction: number) {
    const newIndex = Math.max(
      0,
      Math.min(this.plugin.settings.rules.length - 1, index + direction)
    );
    [this.plugin.settings.rules[index], this.plugin.settings.rules[newIndex]] =
      [this.plugin.settings.rules[newIndex], this.plugin.settings.rules[index]];
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
      },
      itemSelector: '.setting-item',
      handleSelector: '.drag-handle',
    });
  }

  private addDragHandle(settingEl: HTMLElement, index: number): void {
    const handle = DragDropManager.createDragHandle();
    const handleContainer = document.createElement('div');
    handleContainer.className = 'drag-handle-container';
    handleContainer.appendChild(handle);

    // Insert handle at the beginning of the setting
    settingEl.insertBefore(handleContainer, settingEl.firstChild);
    settingEl.classList.add('with-drag-handle');
  }

  private reorderRules(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    const rules = this.plugin.settings.rules;
    const [movedRule] = rules.splice(fromIndex, 1);
    rules.splice(toIndex, 0, movedRule);

    // Refresh display to show new order
    this.refreshDisplay();
  }

  private get app(): App {
    return this.plugin.app;
  }
}
