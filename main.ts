import { Plugin } from 'obsidian';
import { NoteMoverShortcut } from 'src/core/NoteMoverShortcut';
import { CommandHandler } from 'src/handlers/CommandHandler';
import { DEFAULT_SETTINGS, NoteMoverShortcutSettings, NoteMoverShortcutSettingsTab } from "src/settings/Settings";

export default class NoteMoverShortcutPlugin extends Plugin {
	public settings: NoteMoverShortcutSettings;
	public noteMover: NoteMoverShortcut;
	public command_handler: CommandHandler;

	async onload() {
		await this.load_settings();

		this.noteMover = new NoteMoverShortcut(this);
		this.command_handler = new CommandHandler(this);
		this.command_handler.setup();

		const ribbonIconEl = this.addRibbonIcon('book-plus', 'NoteMover', (evt: MouseEvent) => {
			this.noteMover.moveFocusedNoteToDestination();
		});

		this.addSettingTab(new NoteMoverShortcutSettingsTab(this));
	}

	onunload() {
	}

	async save_settings(): Promise<void> {
        await this.saveData(this.settings);
    }

    async load_settings(): Promise<void> {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }
}
