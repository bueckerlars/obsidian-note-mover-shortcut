import AdvancedNoteMoverPlugin from 'main';
import { Setting } from 'obsidian';
import { MobileUtils } from '../../utils/MobileUtils';

export class AttachmentsSettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addAttachmentSettings(): void {
    const isMobile = MobileUtils.isMobile();
    new Setting(this.containerEl).setName('Attachments').setHeading();

    if (!this.plugin.settings.settings.attachments) {
      this.plugin.settings.settings.attachments = {
        moveWithNote: false,
        skipSharedAttachments: true,
        deleteEmptyAssetFolders: false,
      };
    }

    const attachments = this.plugin.settings.settings.attachments;

    const moveWithNoteDesc =
      'When a markdown note is moved, also move images and other attachments referenced in the note that live in the note folder or its subfolders (e.g. _assets/). Relative link structure is preserved.';

    const moveWithNoteSetting = new Setting(this.containerEl)
      .setName('Move attachments with note')
      .setDesc(moveWithNoteDesc)
      .addToggle(toggle =>
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
      const skipSharedSetting = new Setting(this.containerEl)
        .setName('Skip shared attachments')
        .setDesc(
          'Do not move attachment files that are also linked from other notes. Prevents breaking references elsewhere in the vault.'
        )
        .addToggle(toggle =>
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

      const deleteEmptySetting = new Setting(this.containerEl)
        .setName('Delete empty asset folders')
        .setDesc(
          'After moving attachments, remove source folders (such as _assets) that no longer contain any files.'
        )
        .addToggle(toggle =>
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
