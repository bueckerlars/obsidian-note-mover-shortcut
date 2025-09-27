import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { DragDropManager } from '../../utils/DragDropManager';

export class FilterSettingsSection {
  private dragDropManager: DragDropManager | null = null;

  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addFilterSettings(): void {
    // Filter settings
    new Setting(this.containerEl).setName('Filter').setHeading();

    new Setting(this.containerEl)
      .setName('Filter mode')
      .setDesc('Choose between blacklist or whitelist mode')
      .addDropdown(dropdown =>
        dropdown
          .addOption('blacklist', 'Blacklist (exclude matching files)')
          .addOption('whitelist', 'Whitelist (include only matching files)')
          .setValue(
            this.plugin.settings.isFilterWhitelist ? 'whitelist' : 'blacklist'
          )
          .onChange(async value => {
            this.plugin.settings.isFilterWhitelist = value === 'whitelist';
            await this.plugin.save_settings();
            // Update RuleManager
            this.plugin.noteMover.updateRuleManager();
          })
      );

    this.addPeriodicMovementFilterArray();

    new Setting(this.containerEl).addButton(btn =>
      btn
        .setButtonText('Add new filter')
        .setCta()
        .onClick(async () => {
          this.plugin.settings.filter.push('');
          await this.plugin.save_settings();
          // Update RuleManager
          this.plugin.noteMover.updateRuleManager();
          this.refreshDisplay();
        })
    );
  }

  addPeriodicMovementFilterArray(): void {
    // Create a container for filters with drag & drop
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filters-container';
    this.containerEl.appendChild(filtersContainer);

    // Setup drag & drop manager
    this.setupDragDropManager(filtersContainer);

    this.plugin.settings.filter.forEach((filter, index) => {
      const s = new Setting(filtersContainer)
        .addSearch(cb => {
          // AdvancedSuggest instead of TagSuggest
          new (require('../suggesters/AdvancedSuggest').AdvancedSuggest)(
            this.app,
            cb.inputEl
          );
          cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.FILTER)
            .setValue(filter || '')
            .onChange(async value => {
              // Don't save empty filters
              if (!value || value.trim() === '') {
                this.plugin.settings.filter[index] = '';
              } else {
                this.plugin.settings.filter[index] = value;
              }
              await this.plugin.save_settings();
              // Update RuleManager
              this.plugin.noteMover.updateRuleManager();
            });
          // @ts-ignore
          cb.containerEl.addClass('note_mover_search');
        })
        .addExtraButton(btn =>
          btn.setIcon('cross').onClick(async () => {
            this.plugin.settings.filter.splice(index, 1);
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

  moveFilter(index: number, direction: number) {
    const newIndex = Math.max(
      0,
      Math.min(this.plugin.settings.filter.length - 1, index + direction)
    );
    [
      this.plugin.settings.filter[index],
      this.plugin.settings.filter[newIndex],
    ] = [
      this.plugin.settings.filter[newIndex],
      this.plugin.settings.filter[index],
    ];
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
        this.reorderFilters(fromIndex, toIndex);
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

  private reorderFilters(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    const filters = this.plugin.settings.filter;
    const [movedFilter] = filters.splice(fromIndex, 1);
    filters.splice(toIndex, 0, movedFilter);

    // Refresh display to show new order
    this.refreshDisplay();
  }

  private get app(): App {
    return this.plugin.app;
  }
}
