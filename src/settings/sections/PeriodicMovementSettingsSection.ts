import AdvancedNoteMoverPlugin from 'main';
import { Setting } from 'obsidian';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { MobileUtils } from '../../utils/MobileUtils';
import { applyPeriodicInterval } from '../intervalInput';
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
    const isMobile = MobileUtils.isMobile();
    new Setting(this.containerEl).setName('Triggers').setHeading();

    // On Edit Trigger Toggle
    const onEditSetting = new Setting(this.containerEl)
      .setName('Enable on-edit trigger')
      .setDesc(
        'Automatically check and move the edited note when a file is modified'
      )
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.pluginData.settings.triggers.enableOnEditTrigger ===
              true
          )
          .onChange(async value => {
            this.plugin.pluginData.settings.triggers.enableOnEditTrigger =
              value;
            await this.plugin.save_settings();
            // Activate/Deactivate on-edit listener
            this.plugin.triggerHandler.toggleOnEditListener();

            // Force refresh display
            this.refreshDisplay();
          })
      );

    // Add mobile optimization classes
    if (isMobile) {
      onEditSetting.settingEl.addClass('advancedNoteMover-mobile-optimized');
      const controlEl = onEditSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass(
          'advancedNoteMover-mobile-toggle-control'
        );
      }
    }

    // Periodic Movement Toggle
    const periodicSetting = new Setting(this.containerEl)
      .setName('Enable periodic movement')
      .setDesc('Enable the periodic movement of notes')
      .addToggle(toggle =>
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

    // Add mobile optimization classes
    if (isMobile) {
      periodicSetting.settingEl.addClass('advancedNoteMover-mobile-optimized');
      const controlEl = periodicSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass(
          'advancedNoteMover-mobile-toggle-control'
        );
      }
    }

    if (this.plugin.pluginData.settings.triggers.enablePeriodicMovement) {
      const intervalSetting = new Setting(this.containerEl)
        .setName('Periodic movement interval')
        .setDesc(
          'Set the interval for the periodic movement of notes in minutes'
        )
        .addText(text =>
          text
            .setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.INTERVAL)
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

      // Add mobile optimization classes
      if (isMobile) {
        intervalSetting.settingEl.addClass(
          'advancedNoteMover-mobile-optimized'
        );
        const controlEl = intervalSetting.settingEl.querySelector(
          '.setting-item-control'
        );
        if (controlEl) {
          (controlEl as HTMLElement).addClass(
            'advancedNoteMover-mobile-input-control'
          );
        }
        const inputEl =
          intervalSetting.settingEl.querySelector('input[type="text"]');
        if (inputEl) {
          (inputEl as HTMLElement).addClass(
            'advancedNoteMover-mobile-text-input'
          );
        }
      }
    }
  }
}
