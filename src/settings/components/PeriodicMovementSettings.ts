import { Setting } from "obsidian";
import NoteMoverShortcutPlugin from "main";
import { NoteMoverError } from "src/utils/Error";
import { log_error } from "src/utils/Log";

export class PeriodicMovementSettings {
    constructor(
        private containerEl: HTMLElement,
        private plugin: NoteMoverShortcutPlugin
    ) {}

    display(): void {
        new Setting(this.containerEl).setName('Periodic movement').setHeading();

        new Setting(this.containerEl)
            .setName('Enable periodic movement')
            .setDesc('Enable the periodic movement of notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePeriodicMovement)
                .onChange(async (value) => {
                    this.plugin.settings.enablePeriodicMovement = value;
                    await this.plugin.save_settings();
                    this.plugin.noteMover.togglePeriodicMovementInterval();
                    this.display();
                })
            );
        
        if (this.plugin.settings.enablePeriodicMovement) {
            new Setting(this.containerEl)
                .setName('Periodic movement interval')
                .setDesc('Set the interval for the periodic movement of notes in minutes')
                .addText(text => text
                    .setPlaceholder('5')
                    .setValue(this.plugin.settings.periodicMovementInterval.toString())
                    .onChange(async (value) => {
                        const interval = parseInt(value);
                        if (isNaN(interval)) {
                            log_error(new NoteMoverError('Interval must be a number'));
                            return;
                        }
                        if (interval < 1) {
                            log_error(new NoteMoverError('Interval must be greater than 0'));
                            return;
                        }

                        this.plugin.settings.periodicMovementInterval = interval;
                        await this.plugin.save_settings();
                    })
                );
        }
    }
} 