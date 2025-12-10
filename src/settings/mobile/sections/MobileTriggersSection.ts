import NoteMoverShortcutPlugin from 'main';
import { MobileToggleSetting } from '../components/MobileToggleSetting';
import { MobileInputSetting } from '../components/MobileInputSetting';
import { createError, handleError } from '../../../utils/Error';
import { SETTINGS_CONSTANTS } from '../../../config/constants';

/**
 * Mobile-optimized triggers section
 */
export class MobileTriggersSection {
  private sectionContainer: HTMLElement;

  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay?: () => void
  ) {
    this.sectionContainer = this.containerEl.createDiv({
      cls: 'mobile-section-container',
    });
  }

  render(): void {
    this.sectionContainer.empty();

    // Section heading
    const heading = this.sectionContainer.createDiv({
      cls: 'mobile-section-heading',
    });
    heading.textContent = 'Triggers';
    heading.style.fontSize = '1.2em';
    heading.style.fontWeight = '600';
    heading.style.marginBottom = '12px';
    heading.style.marginTop = '16px';

    // On Edit Trigger
    new MobileToggleSetting(
      this.sectionContainer,
      'Enable on-edit trigger',
      'Move notes automatically when edited',
      this.plugin.settings.settings.triggers.enableOnEditTrigger === true,
      async value => {
        this.plugin.settings.settings.triggers.enableOnEditTrigger = value;
        await this.plugin.save_settings();
        (this.plugin as any).triggerHandler?.toggleOnEditListener();
      }
    );

    // Periodic Movement Toggle
    const periodicToggle = new MobileToggleSetting(
      this.sectionContainer,
      'Enable periodic movement',
      'Move notes at regular intervals',
      this.plugin.settings.settings.triggers.enablePeriodicMovement,
      async value => {
        this.plugin.settings.settings.triggers.enablePeriodicMovement = value;
        await this.plugin.save_settings();
        (this.plugin as any).triggerHandler?.togglePeriodic();
        // Refresh display to show/hide interval input
        if (this.refreshDisplay) {
          this.refreshDisplay();
        }
      }
    );

    // Periodic Movement Interval (only if enabled)
    if (this.plugin.settings.settings.triggers.enablePeriodicMovement) {
      new MobileInputSetting(
        this.sectionContainer,
        'Periodic movement interval',
        'Interval in minutes',
        SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.INTERVAL,
        this.plugin.settings.settings.triggers.periodicMovementInterval.toString(),
        async value => {
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
          (this.plugin as any).triggerHandler?.togglePeriodic();
        }
      );
    }
  }
}
