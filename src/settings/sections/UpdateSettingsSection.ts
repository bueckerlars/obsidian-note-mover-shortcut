import AdvancedNoteMoverPlugin from 'main';
import { Setting } from 'obsidian';
import { strings } from '../../i18n/locale';

export class UpdateSettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement
  ) {}

  addUpdateSettings(): void {
    new Setting(this.containerEl)
      .setName(strings().settings.headingsUpdates)
      .setHeading();

    new Setting(this.containerEl)
      .setName(strings().settings.updatesReleaseNotesName)
      .setDesc(strings().settings.updatesReleaseNotesDesc)
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
