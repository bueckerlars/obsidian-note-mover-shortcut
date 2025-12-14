import NoteMoverShortcutPlugin from 'main';
import { MobileButtonSetting } from '../components/MobileButtonSetting';
import { MobileInputSetting } from '../components/MobileInputSetting';
import { AdvancedSuggest } from '../../suggesters/AdvancedSuggest';
import { SETTINGS_CONSTANTS } from '../../../config/constants';
import { MobileUtils } from '../../../utils/MobileUtils';

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

    // Description
    const desc = this.sectionContainer.createDiv({
      cls: 'noteMover-mobile-section-description',
    });
    desc.textContent =
      'Blacklist filters. Files matching any criteria will be excluded from movement.';

    // Filters list container
    const filtersContainer = this.sectionContainer.createDiv({
      cls: 'noteMover-mobile-filters-list-container',
    });

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

      // Filter input
      const inputLabel = filterCard.createDiv({
        cls: 'noteMover-mobile-input-label',
        text: `Filter ${index + 1}`,
      });

      const inputContainer = filterCard.createDiv();
      const input = inputContainer.createEl('input', {
        cls: 'noteMover-mobile-text-input',
        type: 'text',
        attr: {
          placeholder: SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.FILTER,
          value: (filter?.value as string) || '',
        },
      });

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

      // Move Up button
      if (index > 0) {
        MobileUtils.createMoveButton(
          moveButtonsContainer,
          'up',
          async () => {
            this.moveFilter(index, -1);
          },
          false
        );
      }

      // Move Down button
      if (index < filters.length - 1) {
        MobileUtils.createMoveButton(
          moveButtonsContainer,
          'down',
          async () => {
            this.moveFilter(index, 1);
          },
          false
        );
      }

      // Delete button
      const deleteButton = filterCard.createEl('button', {
        cls: 'noteMover-mobile-action-btn noteMover-mobile-delete-btn',
        text: 'Delete',
      });

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
