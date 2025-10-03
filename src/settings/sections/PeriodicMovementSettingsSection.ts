import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { createError, handleError } from 'src/utils/Error';
import { SETTINGS_CONSTANTS } from '../../config/constants';

export class TriggerSettingsSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addTriggerSettings(): void {
    new Setting(this.containerEl).setName('Triggers').setHeading();

    // On Edit Trigger Toggle
    new Setting(this.containerEl)
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

    // Periodic Movement Toggle
    new Setting(this.containerEl)
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

    if (this.plugin.settings.settings.triggers.enablePeriodicMovement) {
      new Setting(this.containerEl)
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
    }
  }

  private get app(): App {
    return this.plugin.app;
  }
}
