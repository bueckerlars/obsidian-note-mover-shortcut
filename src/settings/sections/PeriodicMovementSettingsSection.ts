import AdvancedNoteMoverPlugin from 'main';
import { strings } from '../../i18n/locale';
import { MobileUtils } from '../../utils/MobileUtils';
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
    const isMobile = MobileUtils.isMobile();
    renderSetting(this.containerEl, 'triggers.heading');

    const onEditSetting = renderSetting(
      this.containerEl,
      'triggers.onEdit'
    ).addToggle(toggle =>
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
    const periodicSetting = renderSetting(
      this.containerEl,
      'triggers.periodic'
    ).addToggle(toggle =>
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
