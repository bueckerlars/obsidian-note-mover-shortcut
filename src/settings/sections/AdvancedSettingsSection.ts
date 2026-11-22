import { strings } from '../../i18n/locale';
import { addNavRow } from '../navRow';
import { createSettingGroup } from '../settingGroup';
import type { SectionContext } from '../pages';

/** Last main-page group: sub-page links and the release notes toggle. */
export class AdvancedSettingsSection {
  constructor(private readonly ctx: SectionContext) {}

  render(): void {
    const { plugin, containerEl, navigate } = this.ctx;
    const labels = strings().settings;
    const group = createSettingGroup(containerEl, {
      heading: labels.headingsAdvanced,
    });

    addNavRow(group, {
      name: labels.importExportNavName,
      desc: labels.importExportNavDesc,
      onOpen: () => navigate('importExport'),
    });
    addNavRow(group, {
      name: labels.performanceNavName,
      desc: labels.performanceNavDesc,
      onOpen: () => navigate('performance'),
    });
    group.addSetting(setting =>
      setting.setName(labels.updatesReleaseNotesName).addToggle(toggle =>
        toggle
          .setValue(
            plugin.pluginData.settings.showReleaseNotesOnUpdate !== false
          )
          .onChange(async value => {
            plugin.pluginData.settings.showReleaseNotesOnUpdate = value;
            await plugin.save_settings();
          })
      )
    );
  }
}
