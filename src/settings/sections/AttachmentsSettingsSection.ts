import AdvancedNoteMoverPlugin from 'main';
import { MobileUtils } from '../../utils/MobileUtils';
import { renderSetting } from '../settingDefinitions';

export class AttachmentsSettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addAttachmentSettings(): void {
    const isMobile = MobileUtils.isMobile();
    renderSetting(this.containerEl, 'attachments.heading');

    if (!this.plugin.pluginData.settings.attachments) {
      this.plugin.pluginData.settings.attachments = {
        moveWithNote: false,
        skipSharedAttachments: true,
        deleteEmptyAssetFolders: false,
      };
    }

    const attachments = this.plugin.pluginData.settings.attachments;

    const moveWithNoteSetting = renderSetting(
      this.containerEl,
      'attachments.move'
    ).addToggle(toggle =>
      toggle
        .setValue(attachments.moveWithNote === true)
        .onChange(async value => {
          attachments.moveWithNote = value;
          await this.plugin.save_settings();
          this.refreshDisplay();
        })
    );

    if (isMobile) {
      moveWithNoteSetting.settingEl.addClass(
        'advancedNoteMover-mobile-optimized'
      );
    }

    if (attachments.moveWithNote) {
      const skipSharedSetting = renderSetting(
        this.containerEl,
        'attachments.skip'
      ).addToggle(toggle =>
        toggle
          .setValue(attachments.skipSharedAttachments !== false)
          .onChange(async value => {
            attachments.skipSharedAttachments = value;
            await this.plugin.save_settings();
          })
      );

      if (isMobile) {
        skipSharedSetting.settingEl.addClass(
          'advancedNoteMover-mobile-optimized'
        );
      }

      const deleteEmptySetting = renderSetting(
        this.containerEl,
        'attachments.deleteEmpty'
      ).addToggle(toggle =>
        toggle
          .setValue(attachments.deleteEmptyAssetFolders === true)
          .onChange(async value => {
            attachments.deleteEmptyAssetFolders = value;
            await this.plugin.save_settings();
          })
      );

      if (isMobile) {
        deleteEmptySetting.settingEl.addClass(
          'advancedNoteMover-mobile-optimized'
        );
      }
    }
  }
}
