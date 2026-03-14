import NoteMoverShortcutPlugin from 'main';
import { Setting } from 'obsidian';

/**
 * Settings section for the Legacy Rules (V1) toggle, placed at the bottom of the settings.
 */
export class LegacySettingsSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addLegacySettings(): void {
    new Setting(this.containerEl).setName('Legacy').setHeading();

    const legacyDesc = document.createDocumentFragment();
    legacyDesc.append(
      'Enable Legacy Rules (V1) to use the older rule format. Rules V2 is now the default and supports multiple conditions and logical operators.',
      document.createElement('br'),
      'Legacy mode is not actively developed. Consider migrating to Rules V2 via the migration prompt.'
    );

    new Setting(this.containerEl)
      .setName('Enable Legacy Rules (V1)')
      .setDesc(legacyDesc)
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.settings.enableLegacyRules ?? false)
          .onChange(async value => {
            this.plugin.settings.settings.enableLegacyRules = value;
            await this.plugin.save_settings();
            this.plugin.noteMover.updateRuleManager();
            this.refreshDisplay();
          })
      );
  }
}
