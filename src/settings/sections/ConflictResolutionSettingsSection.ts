import AdvancedNoteMoverPlugin from 'main';
import { Setting } from 'obsidian';
import { MobileUtils } from '../../utils/MobileUtils';
import type { ConflictResolutionStrategy } from '../../types/ConflictResolution';
import { strategyRequiresWarning } from '../../domain/conflicts/note-move-conflict';
import { persistConflictResolutionStrategy } from '../../application/persist-conflict-resolution-strategy';
import { strings } from '../../i18n/locale';

export class ConflictResolutionSettingsSection {
  private warningEl: HTMLElement | null = null;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement
  ) {}

  addConflictResolutionSettings(): void {
    const isMobile = MobileUtils.isMobile();

    new Setting(this.containerEl)
      .setName(strings().settings.headingsConflict)
      .setHeading();

    if (!this.plugin.pluginData.settings.conflictResolution) {
      this.plugin.pluginData.settings.conflictResolution = { strategy: 'skip' };
    }

    const currentStrategy =
      this.plugin.pluginData.settings.conflictResolution.strategy ?? 'skip';

    const strategySetting = new Setting(this.containerEl)
      .setName(strings().settings.conflictWhenExists)
      .setDesc(strings().conflictStrategyDescriptions[currentStrategy])
      .addDropdown(dropdown => {
        for (const [value, label] of Object.entries(
          strings().conflictStrategies
        )) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(currentStrategy).onChange(async value => {
          const strategy = value as ConflictResolutionStrategy;
          await persistConflictResolutionStrategy(this.plugin, strategy);
          strategySetting.setDesc(
            strings().conflictStrategyDescriptions[strategy]
          );
          this.updateWarning(strategy);
        });
      });

    if (isMobile) {
      strategySetting.settingEl.addClass('advancedNoteMover-mobile-optimized');
    }

    this.warningEl = this.containerEl.createDiv({
      cls: 'advancedNoteMover-conflict-settings-warning',
    });
    this.updateWarning(currentStrategy);
  }

  private updateWarning(strategy: ConflictResolutionStrategy): void {
    if (!this.warningEl) {
      return;
    }
    this.warningEl.empty();

    if (strategy === 'ask') {
      return;
    }

    const warningText = strategyRequiresWarning(strategy)
      ? strings().settings.conflictOverwriteWarning
      : strings().settings.conflictAutoWarning;

    this.warningEl.createEl('p', {
      cls: strategyRequiresWarning(strategy)
        ? 'advancedNoteMover-settings-hint mod-warning'
        : 'advancedNoteMover-settings-hint',
      text: warningText,
    });
  }
}
