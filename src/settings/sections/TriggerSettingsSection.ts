import AdvancedNoteMoverPlugin from 'main';
import { strings } from '../../i18n/locale';
import { applyPeriodicInterval } from '../intervalInput';
import { renderSetting } from '../settingDefinitions';
import { viewClearTimeout, viewTimeout } from '../../utils/viewTimers';

export class TriggerSettingsSection {
  private intervalCommit: number | null = null;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  cleanup(): void {
    if (this.intervalCommit !== null) {
      viewClearTimeout(this.intervalCommit);
      this.intervalCommit = null;
    }
  }

  addTriggerSettings(): void {
    renderSetting(this.containerEl, 'triggers.heading');

    renderSetting(this.containerEl, 'triggers.onEdit').addToggle(toggle =>
      toggle
        .setValue(
          this.plugin.pluginData.settings.triggers.enableOnEditTrigger === true
        )
        .onChange(async value => {
          this.plugin.pluginData.settings.triggers.enableOnEditTrigger = value;
          await this.plugin.save_settings();
          // Activate/Deactivate on-edit listener
          this.plugin.triggerHandler.toggleOnEditListener();

          // Force refresh display
          this.refreshDisplay();
        })
    );

    renderSetting(this.containerEl, 'triggers.periodic').addToggle(toggle =>
      toggle
        .setValue(
          this.plugin.pluginData.settings.triggers.enablePeriodicMovement
        )
        .onChange(async value => {
          this.plugin.pluginData.settings.triggers.enablePeriodicMovement =
            value;
          await this.plugin.save_settings();
          // Toggle interval based on the new value via TriggerEventHandler
          this.plugin.triggerHandler.togglePeriodic();

          // Force refresh display
          this.refreshDisplay();
        })
    );

    if (this.plugin.pluginData.settings.triggers.enablePeriodicMovement) {
      const intervalSetting = renderSetting(
        this.containerEl,
        'triggers.interval'
      ).addText(text =>
        text
          .setPlaceholder(strings().settings.triggersIntervalPlaceholder)
          .setValue(
            this.plugin.pluginData.settings.triggers.periodicMovementInterval.toString()
          )
          .onChange(value => {
            if (this.intervalCommit !== null) {
              viewClearTimeout(this.intervalCommit);
            }
            this.intervalCommit = viewTimeout(() => {
              this.intervalCommit = null;
              const current =
                this.plugin.pluginData.settings.triggers
                  .periodicMovementInterval;
              const error = applyPeriodicInterval({
                raw: value,
                current,
                startTimer: minutes => {
                  this.plugin.pluginData.settings.triggers.periodicMovementInterval =
                    minutes;
                  void this.plugin.save_settings();
                  this.plugin.triggerHandler.togglePeriodic();
                },
              });
              text.inputEl.toggleAttribute('aria-invalid', error !== null);
              if (error) {
                text.inputEl.title = error;
              } else {
                text.inputEl.removeAttribute('title');
              }
            }, 300);
          })
      );

      intervalSetting.setClass('advancedNoteMover-setting-stack');
    }
  }
}
