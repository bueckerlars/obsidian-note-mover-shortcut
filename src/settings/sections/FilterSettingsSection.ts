import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { DragDropManager } from '../../utils/DragDropManager';
import { AdvancedSuggest } from '../suggesters/AdvancedSuggest';

export class FilterSettingsSection {
  private dragDropManager: DragDropManager | null = null;
  private advancedSuggestInstances: AdvancedSuggest[] = [];

  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addFilterSettings(): void {
    // Filter settings
    new Setting(this.containerEl).setName('Filter').setHeading();

    // Add description for blacklist filters
    new Setting(this.containerEl)
      .setName('Filter Description')
      .setDesc(
        'These are blacklist filters. Files that match any of the specified criteria will be excluded from movement operations.'
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
    // Clean up existing AdvancedSuggest instances before creating new ones
    this.cleanupAdvancedSuggestInstances();

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
          const advancedSuggest = new AdvancedSuggest(this.app, cb.inputEl);
          // Track the instance for cleanup
          this.advancedSuggestInstances.push(advancedSuggest);
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
        // Refresh display after settings are fully saved
        this.refreshDisplay();
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
}
