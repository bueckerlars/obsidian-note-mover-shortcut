import AdvancedNoteMoverPlugin from 'main';
import { Setting } from 'obsidian';

export class UpdateSettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement
  ) {}

  addUpdateSettings(): void {
    new Setting(this.containerEl).setName('Updates').setHeading();

    new Setting(this.containerEl)
      .setName('Show release notes after plugin update')
      .setDesc(
        'When enabled, opens the changelog modal once after you install a newer plugin version. Applies across all vaults; does not show on every startup or vault switch.'
      )
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.pluginData.settings.showReleaseNotesOnUpdate !== false
          )
          .onChange(async value => {
            this.plugin.pluginData.settings.showReleaseNotesOnUpdate = value;
            await this.plugin.save_settings();
          })
      );
  }
}
