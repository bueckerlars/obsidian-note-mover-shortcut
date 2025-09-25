import NoteMoverShortcutPlugin from "main";
import { App, Setting } from "obsidian";
import { createError, handleError } from "src/utils/Error";
import { SETTINGS_CONSTANTS } from "../../config/constants";

export class PeriodicMovementSettingsSection {
	constructor(
		private plugin: NoteMoverShortcutPlugin,
		private containerEl: HTMLElement,
		private refreshDisplay: () => void
	) {}

	addPeriodicMovementSetting(): void {
		new Setting(this.containerEl).setName('Periodic movement').setHeading();

		new Setting(this.containerEl)
			.setName('Enable periodic movement')
			.setDesc('Enable the periodic movement of notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enablePeriodicMovement)
				.onChange(async (value) => {
					this.plugin.settings.enablePeriodicMovement = value;
					await this.plugin.save_settings();
					// Toggle interval based in the new value
					this.plugin.noteMover.togglePeriodicMovementInterval();
					
					// Force refresh display
					this.refreshDisplay();
				})
			);
		
		if (this.plugin.settings.enablePeriodicMovement) {
			new Setting(this.containerEl)
				.setName('Periodic movement interval')
				.setDesc('Set the interval for the periodic movement of notes in minutes')
				.addText(text => text
					.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.INTERVAL)
					.setValue(this.plugin.settings.periodicMovementInterval.toString())
					.onChange(async (value) => {
						const interval = parseInt(value);
						if (isNaN(interval)) {
							handleError(createError('Interval must be a number'), 'Periodic movement interval setting', false);
							return;
						}
						if (interval < 1) {
							handleError(createError('Interval must be greater than 0'), 'Periodic movement interval setting', false);
							return;
						}

						this.plugin.settings.periodicMovementInterval = interval;
						await this.plugin.save_settings();
					})
				);
		}
	}

	private get app(): App {
		return this.plugin.app;
	}
}
