import NoteMoverShortcutPlugin from 'main';
import { MobileButtonSetting } from '../components/MobileButtonSetting';
import { MobileInputSetting } from '../components/MobileInputSetting';
import { AdvancedSuggest } from '../../suggesters/AdvancedSuggest';
import { SETTINGS_CONSTANTS } from '../../../config/constants';

/**
 * Mobile-optimized filters section
 */
export class MobileFiltersSection {
  private filterInputs: Array<{
    input: MobileInputSetting;
    suggest: AdvancedSuggest;
  }> = [];
  private sectionContainer: HTMLElement;

  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay?: () => void
  ) {
    this.sectionContainer = this.containerEl.createDiv({
      cls: 'noteMover-mobile-section-container',
    });
  }

  render(): void {
    this.sectionContainer.empty();

    // Section heading
    const heading = this.sectionContainer.createDiv({
      cls: 'noteMover-mobile-section-heading',
    });
    heading.textContent = 'Filter';
    heading.style.fontSize = '1.2em';
    heading.style.fontWeight = '600';
    heading.style.marginBottom = '12px';
    heading.style.marginTop = '16px';

    // Description
    const desc = this.sectionContainer.createDiv({
      cls: 'noteMover-mobile-section-description',
    });
    desc.textContent =
      'Blacklist filters. Files matching any criteria will be excluded from movement.';
    desc.style.fontSize = '0.9em';
    desc.style.color = 'var(--text-muted)';
    desc.style.marginBottom = '12px';

    // Filters list container
    const filtersContainer = this.sectionContainer.createDiv({
      cls: 'noteMover-mobile-filters-list-container',
    });
    filtersContainer.style.marginBottom = '12px';

    // Render existing filters
    this.renderFilters(filtersContainer);

    // Add Filter Button
    const addFilterButton = new MobileButtonSetting(
      this.sectionContainer,
      '',
      undefined,
      'Add new filter',
      async () => {
        this.plugin.settings.settings.filters.filter.push({ value: '' });
        await this.plugin.save_settings();
        this.plugin.noteMover.updateRuleManager();
        if (this.refreshDisplay) {
          this.refreshDisplay();
        }
      },
      { isPrimary: true }
    );
  }

  private moveFilter(index: number, direction: number): void {
    const filters = this.plugin.settings.settings.filters.filter;
    if (!filters || filters.length === 0) return;

    const newIndex = Math.max(
      0,
      Math.min(filters.length - 1, index + direction)
    );
    if (newIndex === index) return;

    [filters[index], filters[newIndex]] = [filters[newIndex], filters[index]];
    this.plugin.save_settings();
    this.plugin.noteMover.updateRuleManager();
    if (this.refreshDisplay) {
      this.refreshDisplay();
    }
  }

  private renderFilters(container: HTMLElement): void {
    // Clean up existing inputs
    this.filterInputs = [];
    container.empty();

    const filters = this.plugin.settings.settings.filters.filter;
    filters.forEach((filter, index) => {
      // Create filter card
      const filterCard = container.createDiv({
        cls: 'noteMover-mobile-filter-card',
      });
      filterCard.style.padding = '12px';
      filterCard.style.marginBottom = '8px';
      filterCard.style.border = '1px solid var(--background-modifier-border)';
      filterCard.style.borderRadius = '8px';
      filterCard.style.background = 'var(--background-secondary)';

      // Filter input
      const inputLabel = filterCard.createDiv({
        cls: 'noteMover-mobile-input-label',
        text: `Filter ${index + 1}`,
      });
      inputLabel.style.marginBottom = '8px';
      inputLabel.style.fontWeight = '500';

      const inputContainer = filterCard.createDiv();
      const input = inputContainer.createEl('input', {
        cls: 'noteMover-mobile-text-input',
        type: 'text',
        attr: {
          placeholder: SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.FILTER,
          value: (filter?.value as string) || '',
        },
      });

      input.style.width = '100%';
      input.style.minHeight = '48px';
      input.style.fontSize = '16px';
      input.style.padding = '12px';
      input.style.marginBottom = '8px';
      input.style.boxSizing = 'border-box';

      // Add AdvancedSuggest
      const suggest = new AdvancedSuggest(this.plugin.app, input);

      // Input change handler
      input.addEventListener('input', async () => {
        if (!input.value || input.value.trim() === '') {
          filters[index] = { value: '' };
        } else {
          filters[index] = {
            value: input.value,
          };
        }
        await this.plugin.save_settings();
        this.plugin.noteMover.updateRuleManager();
      });

      // Create move buttons container
      const moveButtonsContainer = filterCard.createDiv({
        cls: 'noteMover-mobile-move-buttons-container',
      });
      moveButtonsContainer.style.display = 'flex';
      moveButtonsContainer.style.gap = '8px';
      moveButtonsContainer.style.marginBottom = '12px';
      moveButtonsContainer.style.width = '100%';

      // Move Up button
      const moveUpButton = moveButtonsContainer.createEl('button', {
        cls: 'noteMover-mobile-move-button noteMover-mobile-move-up-button',
      });
      moveUpButton.style.flex = '1';
      moveUpButton.style.minHeight = '48px';
      moveUpButton.style.display = index > 0 ? 'flex' : 'none';
      moveUpButton.style.alignItems = 'center';
      moveUpButton.style.justifyContent = 'center';
      moveUpButton.style.border = '1px solid var(--background-modifier-border)';
      moveUpButton.style.borderRadius = '6px';
      moveUpButton.style.background = 'var(--background-primary)';
      moveUpButton.style.cursor = 'pointer';
      moveUpButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
      moveUpButton.addEventListener('click', async () => {
        if (index > 0) {
          this.moveFilter(index, -1);
        }
      });

      // Move Down button
      const moveDownButton = moveButtonsContainer.createEl('button', {
        cls: 'noteMover-mobile-move-button noteMover-mobile-move-down-button',
      });
      moveDownButton.style.flex = '1';
      moveDownButton.style.minHeight = '48px';
      moveDownButton.style.display =
        index < filters.length - 1 ? 'flex' : 'none';
      moveDownButton.style.alignItems = 'center';
      moveDownButton.style.justifyContent = 'center';
      moveDownButton.style.border =
        '1px solid var(--background-modifier-border)';
      moveDownButton.style.borderRadius = '6px';
      moveDownButton.style.background = 'var(--background-primary)';
      moveDownButton.style.cursor = 'pointer';
      moveDownButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
      moveDownButton.addEventListener('click', async () => {
        if (index < filters.length - 1) {
          this.moveFilter(index, 1);
        }
      });

      // Delete button
      const deleteButton = filterCard.createEl('button', {
        cls: 'noteMover-mobile-action-btn noteMover-mobile-delete-btn',
        text: 'Delete',
      });
      deleteButton.style.width = '100%';
      deleteButton.style.minHeight = '48px';
      deleteButton.style.background = 'var(--background-modifier-error)';
      deleteButton.style.color = 'var(--text-on-accent)';
      deleteButton.style.border = 'none';
      deleteButton.style.borderRadius = '6px';
      deleteButton.style.cursor = 'pointer';
      deleteButton.style.fontSize = '16px';
      deleteButton.style.fontWeight = '500';

      deleteButton.addEventListener('click', async () => {
        filters.splice(index, 1);
        await this.plugin.save_settings();
        this.plugin.noteMover.updateRuleManager();
        if (this.refreshDisplay) {
          this.refreshDisplay();
        }
      });

      this.filterInputs.push({ input: null as any, suggest });
    });
  }
}
