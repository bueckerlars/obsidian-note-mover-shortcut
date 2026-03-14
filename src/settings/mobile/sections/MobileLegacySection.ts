import NoteMoverShortcutPlugin from 'main';
import { MobileToggleSetting } from '../components/MobileToggleSetting';

/**
 * Mobile section for the Legacy Rules (V1) toggle, placed at the bottom of the settings.
 */
export class MobileLegacySection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay?: () => void
  ) {}

  render(): void {
    const sectionContainer = this.containerEl.createDiv({
      cls: 'noteMover-mobile-section-container',
    });

    const heading = sectionContainer.createDiv({
      cls: 'noteMover-mobile-section-heading',
    });
    heading.textContent = 'Legacy';

    new MobileToggleSetting(
      sectionContainer,
      'Enable Legacy Rules (V1)',
      'Use the older rule format. Rules V2 is the default.',
      this.plugin.settings.settings.enableLegacyRules ?? false,
      async value => {
        this.plugin.settings.settings.enableLegacyRules = value;
        await this.plugin.save_settings();
        this.plugin.noteMover.updateRuleManager();
        if (this.refreshDisplay) {
          this.refreshDisplay();
        }
      }
    );
  }
}
