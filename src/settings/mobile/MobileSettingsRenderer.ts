import NoteMoverShortcutPlugin from 'main';
import { MobileTriggersSection } from './sections/MobileTriggersSection';
import { MobileFiltersSection } from './sections/MobileFiltersSection';
import { MobileRulesSection } from './sections/MobileRulesSection';
import { MobileHistorySection } from './sections/MobileHistorySection';
import { MobileImportExportSection } from './sections/MobileImportExportSection';

/**
 * Main mobile settings renderer that orchestrates all mobile sections
 */
export class MobileSettingsRenderer {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement
  ) {}

  render(): void {
    this.containerEl.addClass('mobile-settings-container');
    this.containerEl.empty();

    // Render all sections in order
    new MobileTriggersSection(this.plugin, this.containerEl, () =>
      this.render()
    ).render();
    new MobileFiltersSection(this.plugin, this.containerEl, () =>
      this.render()
    ).render();
    new MobileRulesSection(this.plugin, this.containerEl, () =>
      this.render()
    ).render();
    new MobileHistorySection(this.plugin, this.containerEl).render();
    new MobileImportExportSection(this.plugin, this.containerEl).render();
  }
}
