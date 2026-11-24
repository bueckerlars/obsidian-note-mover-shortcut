import AdvancedNoteMoverPlugin from 'main';
import { renderSetting } from '../settingDefinitions';

export class UpdateSettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement
  ) {}

  addUpdateSettings(): void {
    renderSetting(this.containerEl, 'updates.heading');

    renderSetting(this.containerEl, 'updates.releaseNotes').addToggle(toggle =>
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
