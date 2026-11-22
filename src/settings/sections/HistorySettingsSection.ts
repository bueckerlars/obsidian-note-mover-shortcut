import { ConfirmModal } from '../../modals/ConfirmModal';
import { HistoryModal } from '../../modals/HistoryModal';
import { fill, strings } from '../../i18n/locale';
import { HISTORY_CONSTANTS } from '../../config/constants';
import {
  FOREVER,
  RETENTION_PRESET_DAYS,
  isCustomRetentionKey,
  keyToRetention,
  retentionToKey,
} from '../historyRetention';
import { addNavRow } from '../navRow';
import { createSettingGroup } from '../settingGroup';
import type { SectionContext } from '../pages';

export class HistorySettingsSection {
  constructor(private readonly ctx: SectionContext) {}

  render(): void {
    const { plugin, containerEl, refresh } = this.ctx;
    const labels = strings().settings;
    const settings = plugin.pluginData.settings;
    settings.retentionPolicy ??= {
      ...HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY,
    };

    const group = createSettingGroup(containerEl, {
      heading: strings().settings.headingsHistory,
    });

    const moves = plugin.historyManager.getHistory().length;
    addNavRow(group, {
      name: labels.historyNavName,
      desc: labels.historyNavDesc,
      value: fill(
        moves === 1 ? labels.historyCountOne : labels.historyCountMany,
        { count: moves }
      ),
      onOpen: () =>
        new HistoryModal(plugin.app, plugin.historyManager, plugin).open(),
    });

    group.addSetting(setting =>
      setting
        .setName(labels.historyKeepName)
        .setDesc(labels.historyKeepDesc)
        .addDropdown(dropdown => {
          const current = retentionToKey(settings.retentionPolicy);
          for (const days of RETENTION_PRESET_DAYS) {
            dropdown.addOption(
              String(days),
              days === 365
                ? fill(labels.historyKeepYear, { count: 1 })
                : fill(labels.historyKeepDays, { count: days })
            );
          }
          if (isCustomRetentionKey(current)) {
            // A value from an older version stays selectable.
            dropdown.addOption(
              current,
              fill(labels.historyKeepDays, { count: current })
            );
          }
          dropdown.addOption(FOREVER, labels.historyKeepForever);
          dropdown.setValue(current).onChange(async value => {
            settings.retentionPolicy = keyToRetention(value);
            await plugin.save_settings();
            await plugin.historyManager.cleanupOldEntries(true);
            refresh();
          });
        })
    );

    group.addSetting(setting =>
      setting
        .setName(labels.historyClearName)
        .setDesc(labels.historyClearDesc)
        .addButton(button => {
          button.setButtonText(labels.historyClearButton);
          // Same class as setWarning. setDestructive needs Obsidian 1.13.
          button.buttonEl.addClass('mod-warning');
          button.onClick(async () => {
            const confirmed = await ConfirmModal.show(plugin.app, {
              title: labels.historyClearTitle,
              message: fill(labels.historyClearMessage, {
                count: plugin.historyManager.getHistory().length,
              }),
              confirmText: labels.historyClearConfirm,
              cancelText: strings().common.cancel,
              danger: true,
            });
            if (confirmed) {
              await plugin.historyManager.clearHistory();
              refresh();
            }
          });
        })
    );
  }
}
