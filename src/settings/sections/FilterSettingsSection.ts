import AdvancedNoteMoverPlugin from 'main';
import { App, Setting } from 'obsidian';
import { strings } from '../../i18n/locale';
import { DragDropManager } from '../../utils/DragDropManager';
import { AdvancedSuggest } from '../suggesters/AdvancedSuggest';
import { MobileUtils } from '../../utils/MobileUtils';
import { renderSetting } from '../settingDefinitions';

export class FilterSettingsSection {
  private dragDropManager: DragDropManager | null = null;
  private advancedSuggestInstances: AdvancedSuggest[] = [];

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addFilterSettings(): void {
    renderSetting(this.containerEl, 'filters.heading');

    this.addPeriodicMovementFilterArray();

    const isMobile = MobileUtils.isMobile();
    const addFilterSetting = renderSetting(
      this.containerEl,
      'filters.add'
    ).addButton(btn =>
      btn
        .setButtonText(strings().settings.filterAdd)
        .setCta()
        .onClick(async () => {
          this.plugin.pluginData.settings.filters.filter.push({ value: '' });
          await this.plugin.save_settings();
          // Update RuleManager
          this.plugin.advancedNoteMover.updateRuleManager();
          this.refreshDisplay();
        })
    );

    // Add mobile optimization classes
    if (isMobile) {
      addFilterSetting.settingEl.addClass('advancedNoteMover-mobile-optimized');
      const controlEl = addFilterSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass(
          'advancedNoteMover-mobile-button-control'
        );
      }
    }
  }

  addPeriodicMovementFilterArray(): void {
    // Clean up existing AdvancedSuggest instances before creating new ones
    this.cleanupAdvancedSuggestInstances();

    const isMobile = MobileUtils.isMobile();

    const filtersContainer = this.containerEl.createDiv({
      cls: 'advancedNoteMover-filters-container',
    });
    if (isMobile) {
      filtersContainer.addClass('advancedNoteMover-mobile-filters-container');
    }

    // Setup drag & drop manager
    this.setupDragDropManager(filtersContainer);

    if (this.plugin.pluginData.settings.filters.filter.length === 0) {
      renderSetting(this.containerEl, 'filters.empty');
    }

    this.plugin.pluginData.settings.filters.filter.forEach((filter, index) => {
      const s = new Setting(filtersContainer);
      this.bindFilterSearch(s, index);
      s.addExtraButton(btn =>
        btn.setIcon('cross').onClick(async () => {
          this.plugin.pluginData.settings.filters.filter.splice(index, 1);
          await this.plugin.save_settings();
          this.plugin.advancedNoteMover.updateRuleManager();
          this.refreshDisplay();
        })
      );

      // Add drag handle to the setting
      this.addDragHandle(s.settingEl, index);
      s.infoEl.remove();

      // Add mobile optimization classes
      if (isMobile) {
        s.settingEl.addClass('advancedNoteMover-mobile-filter-item');
        const controlEl = s.settingEl.querySelector('.setting-item-control');
        if (controlEl) {
          (controlEl as HTMLElement).addClass(
            'advancedNoteMover-mobile-filter-controls'
          );
        }
        const inputEl = s.settingEl.querySelector('input[type="search"]');
        if (inputEl) {
          (inputEl as HTMLElement).addClass(
            'advancedNoteMover-mobile-filter-input'
          );
        }
      }
    });
  }

  moveFilter(index: number, direction: number) {
    const list = this.plugin.pluginData.settings.filters.filter;
    const newIndex = Math.max(0, Math.min(list.length - 1, index + direction));
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    void this.plugin.save_settings();
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
        this.plugin.advancedNoteMover.updateRuleManager();
        // Refresh display after settings are fully saved
        this.refreshDisplay();
      },
      itemSelector: '.setting-item',
      handleSelector: '.advancedNoteMover-drag-handle',
    });
  }

  bindFilterSearch(setting: Setting, index: number): () => void {
    let advancedSuggest: AdvancedSuggest | undefined;
    setting.addSearch(cb => {
      advancedSuggest = new AdvancedSuggest(
        this.app,
        cb.inputEl,
        this.plugin.vaultIndexCache
      );
      this.advancedSuggestInstances.push(advancedSuggest);
      const filter = this.plugin.pluginData.settings.filters.filter[index];
      cb.setPlaceholder(strings().settings.filterPlaceholder)
        .setValue(filter?.value || '')
        .onChange(async value => {
          this.plugin.pluginData.settings.filters.filter[index] = {
            value: !value || value.trim() === '' ? '' : value,
          };
          await this.plugin.save_settings();
          this.plugin.advancedNoteMover.updateRuleManager();
        });
      cb.inputEl.classList.add('advancedNoteMover-search');
    });
    return () => {
      if (!advancedSuggest) {
        return;
      }
      advancedSuggest.destroy();
      this.advancedSuggestInstances = this.advancedSuggestInstances.filter(
        instance => instance !== advancedSuggest
      );
    };
  }

  private addDragHandle(settingEl: HTMLElement, index: number): void {
    const handle = DragDropManager.createDragHandle();
    const handleContainer = createDiv({
      cls: 'advancedNoteMover-drag-handle-container',
    });
    handleContainer.appendChild(handle);

    // Insert handle at the beginning of the setting
    settingEl.insertBefore(handleContainer, settingEl.firstChild);
    settingEl.classList.add('advancedNoteMover-with-drag-handle');
  }

  private reorderFilters(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    const filters = this.plugin.pluginData.settings.filters.filter;
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
