import type { Setting } from 'obsidian';
import { fill, strings } from '../../i18n/locale';
import { createSettingGroup } from '../settingGroup';
import type { SectionContext } from '../pages';

const INTERVAL_MINUTES = [1, 5, 15, 30, 60];

function intervalLabel(minutes: number): string {
  const labels = strings().settings;
  return minutes === 1
    ? labels.intervalOne
    : fill(labels.intervalMany, { count: minutes });
}

export class AutomaticSettingsSection {
  constructor(private readonly ctx: SectionContext) {}

  render(): void {
    const { plugin, containerEl, refresh } = this.ctx;
    const labels = strings().settings;
    const triggers = plugin.pluginData.settings.triggers;
    const hasRules = (plugin.pluginData.settings.rulesV2 ?? []).length > 0;
    const dimWithoutRules = (setting: Setting) => {
      if (hasRules) return;
      setting.setDesc(labels.automaticNeedsRule);
      setting.settingEl.addClass('advancedNoteMover-dim');
    };

    const group = createSettingGroup(containerEl, {
      heading: labels.headingsAutomatic,
    });

    group.addSetting(setting => {
      setting
        .setName(labels.onChangeName)
        .setDesc(labels.onChangeDesc)
        .addToggle(toggle =>
          toggle
            .setDisabled(!hasRules)
            .setValue(hasRules && triggers.enableOnEditTrigger === true)
            .onChange(async value => {
              triggers.enableOnEditTrigger = value;
              await plugin.save_settings();
              plugin.triggerHandler.toggleOnEditListener();
            })
        );
      dimWithoutRules(setting);
    });

    group.addSetting(setting => {
      setting.setName(labels.scheduleName).setDesc(labels.scheduleDesc);
      dimWithoutRules(setting);
      if (hasRules && triggers.enablePeriodicMovement) {
        setting.addDropdown(dropdown => {
          // Older settings can hold any whole number of minutes; keep it selectable.
          const options = INTERVAL_MINUTES.includes(
            triggers.periodicMovementInterval
          )
            ? INTERVAL_MINUTES
            : [...INTERVAL_MINUTES, triggers.periodicMovementInterval].sort(
                (a, b) => a - b
              );
          for (const minutes of options) {
            dropdown.addOption(String(minutes), intervalLabel(minutes));
          }
          dropdown.selectEl.setAttr('aria-label', labels.scheduleIntervalLabel);
          dropdown
            .setValue(String(triggers.periodicMovementInterval))
            .onChange(async value => {
              triggers.periodicMovementInterval = Number(value);
              await plugin.save_settings();
              plugin.triggerHandler.togglePeriodic();
            });
        });
      }
      setting.addToggle(toggle =>
        toggle
          .setDisabled(!hasRules)
          .setValue(hasRules && triggers.enablePeriodicMovement)
          .onChange(async value => {
            triggers.enablePeriodicMovement = value;
            await plugin.save_settings();
            plugin.triggerHandler.togglePeriodic();
            refresh();
          })
      );
    });
  }
}
