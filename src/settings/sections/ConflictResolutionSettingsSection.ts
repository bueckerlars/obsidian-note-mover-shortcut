import AdvancedNoteMoverPlugin from 'main';
import { Setting } from 'obsidian';
import type { ConflictResolutionStrategy } from '../../types/ConflictResolution';
import { strategyRequiresWarning } from '../../domain/conflicts/note-move-conflict';
import { persistConflictResolutionStrategy } from '../../application/persist-conflict-resolution-strategy';
import { strings } from '../../i18n/locale';
import { renderSetting } from '../settingDefinitions';

export class ConflictResolutionSettingsSection {
  private warningSetting: Setting | null = null;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement
  ) {}

  addConflictResolutionSettings(): void {
    renderSetting(this.containerEl, 'conflict.heading');

    if (!this.plugin.pluginData.settings.conflictResolution) {
      this.plugin.pluginData.settings.conflictResolution = { strategy: 'skip' };
    }

    const currentStrategy =
      this.plugin.pluginData.settings.conflictResolution.strategy ?? 'skip';

    const strategySetting = renderSetting(this.containerEl, 'conflict.strategy')
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

    if (currentStrategy !== 'ask') {
      this.warningSetting = renderSetting(this.containerEl, 'conflict.warning');
      this.updateWarning(currentStrategy);
    }
  }

  private updateWarning(strategy: ConflictResolutionStrategy): void {
    if (!this.warningSetting) {
      return;
    }
    if (strategy === 'ask') {
      this.warningSetting.setDesc('');
      return;
    }
    this.warningSetting.setDesc(
      strategyRequiresWarning(strategy)
        ? strings().settings.conflictOverwriteWarning
        : strings().settings.conflictAutoWarning
    );
  }
}
