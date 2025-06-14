import { Setting } from "obsidian";
import NoteMoverShortcutPlugin from "main";

export class HistorySettings {
    constructor(
        private containerEl: HTMLElement,
        private plugin: NoteMoverShortcutPlugin
    ) {}

    display(): void {
        new Setting(this.containerEl).setName('History').setHeading();

        new Setting(this.containerEl)
            .setName('Clear history')
            .setDesc('Clears the history of moved notes')
            .addButton(btn => btn
                .setButtonText('Clear history')
                .setWarning()
                .onClick(async () => {
                    if (confirm('Are you sure you want to clear the history? This action cannot be undone.')) {
                        await this.plugin.historyManager.clearHistory();
                    }
                })
            );
    }
} 