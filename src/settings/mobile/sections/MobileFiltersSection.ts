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
      cls: 'mobile-section-container',
    });
  }

  render(): void {
    this.sectionContainer.empty();

    // Section heading
    const heading = this.sectionContainer.createDiv({
      cls: 'mobile-section-heading',
    });
    heading.textContent = 'Filter';
    heading.style.fontSize = '1.2em';
    heading.style.fontWeight = '600';
    heading.style.marginBottom = '12px';
    heading.style.marginTop = '16px';

    // Description
    const desc = this.sectionContainer.createDiv({
      cls: 'mobile-section-description',
    });
    desc.textContent =
      'Blacklist filters. Files matching any criteria will be excluded from movement.';
    desc.style.fontSize = '0.9em';
    desc.style.color = 'var(--text-muted)';
    desc.style.marginBottom = '12px';

    // Filters list container
    const filtersContainer = this.sectionContainer.createDiv({
      cls: 'mobile-filters-list-container',
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

  private renderFilters(container: HTMLElement): void {
    // Clean up existing inputs
    this.filterInputs = [];
    container.empty();

    this.plugin.settings.settings.filters.filter.forEach((filter, index) => {
      // Create filter card
      const filterCard = container.createDiv({ cls: 'mobile-filter-card' });
      filterCard.style.padding = '12px';
      filterCard.style.marginBottom = '8px';
      filterCard.style.border = '1px solid var(--background-modifier-border)';
      filterCard.style.borderRadius = '8px';
      filterCard.style.background = 'var(--background-secondary)';

      // Filter input
      const inputLabel = filterCard.createDiv({
        cls: 'mobile-input-label',
        text: `Filter ${index + 1}`,
      });
      inputLabel.style.marginBottom = '8px';
      inputLabel.style.fontWeight = '500';

      const inputContainer = filterCard.createDiv();
      const input = inputContainer.createEl('input', {
        cls: 'mobile-text-input',
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
          this.plugin.settings.settings.filters.filter[index] = { value: '' };
        } else {
          this.plugin.settings.settings.filters.filter[index] = {
            value: input.value,
          };
        }
        await this.plugin.save_settings();
        this.plugin.noteMover.updateRuleManager();
      });

      // Delete button
      const deleteButton = filterCard.createEl('button', {
        cls: 'mobile-action-btn mobile-delete-btn',
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
        this.plugin.settings.settings.filters.filter.splice(index, 1);
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
