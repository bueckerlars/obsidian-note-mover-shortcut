import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { createError, handleError } from 'src/utils/Error';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { MobileUtils } from '../../utils/MobileUtils';

export class TriggerSettingsSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

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
            this.plugin.settings.settings.triggers.enableOnEditTrigger === true
          )
          .onChange(async value => {
            this.plugin.settings.settings.triggers.enableOnEditTrigger = value;
            await this.plugin.save_settings();
            // Activate/Deactivate on-edit listener
            (this.plugin as any).triggerHandler?.toggleOnEditListener();

            // Force refresh display
            this.refreshDisplay();
          })
      );

    // Add mobile optimization classes
    if (isMobile) {
      onEditSetting.settingEl.addClass('noteMover-mobile-optimized');
      const controlEl = onEditSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass('noteMover-mobile-toggle-control');
      }
    }

    // Periodic Movement Toggle
    const periodicSetting = new Setting(this.containerEl)
      .setName('Enable periodic movement')
      .setDesc('Enable the periodic movement of notes')
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.settings.settings.triggers.enablePeriodicMovement
          )
          .onChange(async value => {
            this.plugin.settings.settings.triggers.enablePeriodicMovement =
              value;
            await this.plugin.save_settings();
            // Toggle interval based on the new value via TriggerEventHandler
            (this.plugin as any).triggerHandler?.togglePeriodic();

            // Force refresh display
            this.refreshDisplay();
          })
      );

    // Add mobile optimization classes
    if (isMobile) {
      periodicSetting.settingEl.addClass('noteMover-mobile-optimized');
      const controlEl = periodicSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass('noteMover-mobile-toggle-control');
      }
    }

    if (this.plugin.settings.settings.triggers.enablePeriodicMovement) {
      const intervalSetting = new Setting(this.containerEl)
        .setName('Periodic movement interval')
        .setDesc(
          'Set the interval for the periodic movement of notes in minutes'
        )
        .addText(text =>
          text
            .setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.INTERVAL)
            .setValue(
              this.plugin.settings.settings.triggers.periodicMovementInterval.toString()
            )
            .onChange(async value => {
              const interval = parseInt(value);
              if (isNaN(interval)) {
                handleError(
                  createError('Interval must be a number'),
                  'Periodic movement interval setting',
                  false
                );
                return;
              }
              if (interval < 1) {
                handleError(
                  createError('Interval must be greater than 0'),
                  'Periodic movement interval setting',
                  false
                );
                return;
              }

              this.plugin.settings.settings.triggers.periodicMovementInterval =
                interval;
              await this.plugin.save_settings();
              // If periodic is enabled, restart interval via handler
              (this.plugin as any).triggerHandler?.togglePeriodic();
            })
        );

      // Add mobile optimization classes
      if (isMobile) {
        intervalSetting.settingEl.addClass('noteMover-mobile-optimized');
        const controlEl = intervalSetting.settingEl.querySelector(
          '.setting-item-control'
        );
        if (controlEl) {
          (controlEl as HTMLElement).addClass('noteMover-mobile-input-control');
        }
        const inputEl =
          intervalSetting.settingEl.querySelector('input[type="text"]');
        if (inputEl) {
          (inputEl as HTMLElement).addClass('noteMover-mobile-text-input');
        }
      }
    }
  }

  private get app(): App {
    return this.plugin.app;
  }
}
