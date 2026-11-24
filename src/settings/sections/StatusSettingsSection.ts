import { fill, strings } from '../../i18n/locale';
import { handleError } from '../../utils/Error';
import { createSettingGroup } from '../settingGroup';
import type { SectionContext } from '../pages';

/** Untitled first group: how many notes would move now, and a way into the preview. */
export class StatusSettingsSection {
  constructor(private readonly ctx: SectionContext) {}

  render(): void {
    const { plugin, containerEl } = this.ctx;
    const labels = strings().settings;
    const rules = plugin.pluginData.settings.rulesV2 ?? [];
    if (rules.length === 0) {
      createSettingGroup(containerEl).addSetting(setting =>
        setting.setName(labels.statusEmptyName).setDesc(labels.statusEmptyDesc)
      );
      return;
    }
    const activeRules = rules.filter(rule => rule.active).length;
    const desc =
      activeRules === 0
        ? labels.statusDescNone
        : fill(
            activeRules === 1 ? labels.statusDescOne : labels.statusDescMany,
            { count: activeRules }
          );

    const group = createSettingGroup(containerEl);
    group.addSetting(setting => {
      setting.settingEl.addClass('advancedNoteMover-stack-row');
      setting
        .setName(labels.statusCounting)
        .setDesc(desc)
        .addButton(button =>
          button.setButtonText(labels.statusPreviewButton).onClick(() => {
            plugin.advancedNoteMover.openVaultMovePreview();
          })
        );
      void this.countMoves().then(text => {
        // The page may have been re-rendered while counting.
        if (setting.settingEl.isConnected) {
          setting.setName(text);
        }
      });
    });
  }

  private async countMoves(): Promise<string> {
    const labels = strings().settings;
    try {
      const preview =
        await this.ctx.plugin.advancedNoteMover.generateVaultMovePreview();
      const count = preview.successfulMoves.length;
      if (count === 0) {
        return labels.statusNothing;
      }
      return fill(
        count === 1 ? labels.statusReadyOne : labels.statusReadyMany,
        { count }
      );
    } catch (error) {
      handleError(error, labels.statusFailed, false);
      return labels.statusFailed;
    }
  }
}
