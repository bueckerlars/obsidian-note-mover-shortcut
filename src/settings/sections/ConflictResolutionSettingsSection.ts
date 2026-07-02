import AdvancedNoteMoverPlugin from 'main';
import { Setting } from 'obsidian';
import { MobileUtils } from '../../utils/MobileUtils';
import type { ConflictResolutionStrategy } from '../../types/ConflictResolution';
import { strategyRequiresWarning } from '../../domain/conflicts/note-move-conflict';
import { persistConflictResolutionStrategy } from '../../application/persist-conflict-resolution-strategy';

const STRATEGY_LABELS: Record<ConflictResolutionStrategy, string> = {
  ask: 'Ask every time',
  skip: 'Always skip',
  rename: 'Always rename',
  overwrite: 'Always overwrite',
};

const STRATEGY_DESCRIPTIONS: Record<ConflictResolutionStrategy, string> = {
  ask: 'Show a dialog when a file with the same name already exists at the destination.',
  skip: 'Leave the note in its current location and notify you when a conflict occurs.',
  rename:
    'Automatically append a numeric suffix (e.g. note (1).md) to avoid overwriting.',
  overwrite:
    'Replace the existing file at the destination without asking. Existing content will be lost.',
};

export class ConflictResolutionSettingsSection {
  private warningEl: HTMLElement | null = null;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement
  ) {}

  addConflictResolutionSettings(): void {
    const isMobile = MobileUtils.isMobile();

    new Setting(this.containerEl).setName('Conflict resolution').setHeading();

    if (!this.plugin.pluginData.settings.conflictResolution) {
      this.plugin.pluginData.settings.conflictResolution = { strategy: 'ask' };
    }

    const currentStrategy =
      this.plugin.pluginData.settings.conflictResolution.strategy ?? 'ask';

    const strategySetting = new Setting(this.containerEl)
      .setName('When target file exists')
      .setDesc(STRATEGY_DESCRIPTIONS[currentStrategy])
      .addDropdown(dropdown => {
        for (const [value, label] of Object.entries(STRATEGY_LABELS)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(currentStrategy).onChange(async value => {
          const strategy = value as ConflictResolutionStrategy;
          await persistConflictResolutionStrategy(this.plugin, strategy);
          strategySetting.setDesc(STRATEGY_DESCRIPTIONS[strategy]);
          this.updateWarning(strategy);
        });
      });

    if (isMobile) {
      strategySetting.settingEl.addClass('advancedNoteMover-mobile-optimized');
    }

    this.warningEl = this.containerEl.createEl('div', {
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
      ? 'Warning: Always overwrite will replace existing files at the destination without confirmation. You may lose data.'
      : 'Warning: Conflicts will be handled automatically without asking. You can change this setting at any time.';

    this.warningEl.createEl('p', {
      cls: strategyRequiresWarning(strategy)
        ? 'advancedNoteMover-settings-hint mod-warning'
        : 'advancedNoteMover-settings-hint',
      text: warningText,
    });
  }
}
