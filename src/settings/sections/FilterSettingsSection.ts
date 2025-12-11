import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { DragDropManager } from '../../utils/DragDropManager';
import { AdvancedSuggest } from '../suggesters/AdvancedSuggest';
import { MobileUtils } from '../../utils/MobileUtils';

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

    const isMobile = MobileUtils.isMobile();
    const addFilterSetting = new Setting(this.containerEl).addButton(btn =>
      btn
        .setButtonText('Add new filter')
        .setCta()
        .onClick(async () => {
          this.plugin.settings.settings.filters.filter.push({ value: '' });
          await this.plugin.save_settings();
          // Update RuleManager
          this.plugin.noteMover.updateRuleManager();
          this.refreshDisplay();
        })
    );

    // Add mobile optimization classes
    if (isMobile) {
      addFilterSetting.settingEl.addClass('noteMover-mobile-optimized');
      const controlEl = addFilterSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass('noteMover-mobile-button-control');
      }
    }
  }

  addPeriodicMovementFilterArray(): void {
    // Clean up existing AdvancedSuggest instances before creating new ones
    this.cleanupAdvancedSuggestInstances();

    const isMobile = MobileUtils.isMobile();

    // Create a container for filters with drag & drop
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'noteMover-filters-container';
    if (isMobile) {
      filtersContainer.addClass('noteMover-mobile-filters-container');
    }
    this.containerEl.appendChild(filtersContainer);

    // Setup drag & drop manager
    this.setupDragDropManager(filtersContainer);

    this.plugin.settings.settings.filters.filter.forEach((filter, index) => {
      const s = new Setting(filtersContainer)
        .addSearch(cb => {
          // AdvancedSuggest instead of TagSuggest
          const advancedSuggest = new AdvancedSuggest(this.app, cb.inputEl);
          // Track the instance for cleanup
          this.advancedSuggestInstances.push(advancedSuggest);
          cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.FILTER)
            .setValue((filter?.value as string) || '')
            .onChange(async value => {
              // Don't save empty filters
              if (!value || value.trim() === '') {
                this.plugin.settings.settings.filters.filter[index] = {
                  value: '',
                };
              } else {
                this.plugin.settings.settings.filters.filter[index] = { value };
              }
              await this.plugin.save_settings();
              // Update RuleManager
              this.plugin.noteMover.updateRuleManager();
            });
          // @ts-ignore
          cb.containerEl.addClass('noteMover-search');
        })
        .addExtraButton(btn =>
          btn.setIcon('cross').onClick(async () => {
            this.plugin.settings.settings.filters.filter.splice(index, 1);
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
        s.settingEl.addClass('noteMover-mobile-filter-item');
        const controlEl = s.settingEl.querySelector('.setting-item-control');
        if (controlEl) {
          (controlEl as HTMLElement).addClass(
            'noteMover-mobile-filter-controls'
          );
        }
        const inputEl = s.settingEl.querySelector('input[type="search"]');
        if (inputEl) {
          (inputEl as HTMLElement).addClass('noteMover-mobile-filter-input');
        }
      }
    });
  }

  moveFilter(index: number, direction: number) {
    const list = this.plugin.settings.settings.filters.filter;
    const newIndex = Math.max(0, Math.min(list.length - 1, index + direction));
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
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

  private reorderFilters(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    const filters = this.plugin.settings.settings.filters.filter;
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
