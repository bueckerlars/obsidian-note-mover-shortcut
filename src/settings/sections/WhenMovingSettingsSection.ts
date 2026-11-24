import { fill, strings } from '../../i18n/locale';
import { persistConflictResolutionStrategy } from '../../application/persist-conflict-resolution-strategy';
import { strategyRequiresWarning } from '../../domain/conflicts/note-move-conflict';
import type { ConflictResolutionStrategy } from '../../types/ConflictResolution';
import { addNavRow } from '../navRow';
import { createSettingGroup } from '../settingGroup';
import type { SectionContext } from '../pages';

/** Folders, name conflicts and attachments. */
export class WhenMovingSettingsSection {
  constructor(private readonly ctx: SectionContext) {}

  render(): void {
    const { plugin, containerEl, refresh, navigate } = this.ctx;
    const labels = strings().settings;
    const settings = plugin.pluginData.settings;
    settings.attachments ??= {
      moveWithNote: false,
      skipSharedAttachments: true,
      deleteEmptyAssetFolders: false,
    };
    const attachments = settings.attachments;
    const strategy = settings.conflictResolution?.strategy ?? 'skip';

    const group = createSettingGroup(containerEl, {
      heading: labels.headingsWhenMoving,
    });

    group.addSetting(setting =>
      setting
        .setName(labels.createFoldersName)
        .setDesc(labels.createFoldersDesc)
        .addToggle(toggle =>
          toggle
            .setValue(settings.createMissingDestinationFolders !== false)
            .onChange(async value => {
              settings.createMissingDestinationFolders = value;
              await plugin.save_settings();
              plugin.advancedNoteMover.updateRuleManager();
            })
        )
    );

    group.addSetting(setting => {
      const describe = (value: ConflictResolutionStrategy) =>
        strategyRequiresWarning(value)
          ? strings().settings.conflictOverwriteWarning
          : strings().settings.conflictDesc;
      setting.setName(labels.conflictName).setDesc(describe(strategy));
      setting.addDropdown(dropdown => {
        for (const [value, label] of Object.entries(
          strings().conflictStrategies
        )) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(strategy).onChange(async value => {
          const next = value as ConflictResolutionStrategy;
          await persistConflictResolutionStrategy(plugin, next);
          setting.setDesc(describe(next));
        });
      });
    });

    const skipped = plugin.conflictSkipCacheManager.getEntries().length;
    addNavRow(group, {
      name: labels.skippedNavName,
      desc: labels.skippedNavDesc,
      pill:
        skipped === 0
          ? undefined
          : fill(
              skipped === 1 ? labels.skippedPillOne : labels.skippedPillMany,
              { count: skipped }
            ),
      onOpen: () => navigate('skipped'),
    });

    group.addSetting(setting =>
      setting
        .setName(labels.attachmentsMoveName)
        .setDesc(labels.attachmentsMoveDesc)
        .addToggle(toggle =>
          toggle
            .setValue(attachments.moveWithNote === true)
            .onChange(async value => {
              attachments.moveWithNote = value;
              await plugin.save_settings();
              refresh();
            })
        )
    );

    if (attachments.moveWithNote) {
      group.addSetting(setting => {
        setting
          .setName(labels.attachmentsSkipName)
          .setDesc(labels.attachmentsSkipDesc)
          .addToggle(toggle =>
            toggle
              .setValue(attachments.skipSharedAttachments !== false)
              .onChange(async value => {
                attachments.skipSharedAttachments = value;
                await plugin.save_settings();
              })
          );
        setting.settingEl.addClass('advancedNoteMover-sub-row');
      });
      group.addSetting(setting => {
        setting
          .setName(labels.attachmentsDeleteEmptyName)
          .setDesc(labels.attachmentsDeleteEmptyDesc)
          .addToggle(toggle =>
            toggle
              .setValue(attachments.deleteEmptyAssetFolders === true)
              .onChange(async value => {
                attachments.deleteEmptyAssetFolders = value;
                await plugin.save_settings();
              })
          );
        setting.settingEl.addClass('advancedNoteMover-sub-row');
      });
    }
  }
}
