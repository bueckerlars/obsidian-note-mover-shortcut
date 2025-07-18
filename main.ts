import { Plugin } from 'obsidian';
import { NoteMoverShortcut } from 'src/core/NoteMoverShortcut';
import { CommandHandler } from 'src/handlers/CommandHandler';
import { DEFAULT_SETTINGS, NoteMoverShortcutSettings, NoteMoverShortcutSettingsTab } from "src/settings/Settings";
import { HistoryManager } from 'src/core/HistoryManager';

export default class NoteMoverShortcutPlugin extends Plugin {
	public settings: NoteMoverShortcutSettings;
	public noteMover: NoteMoverShortcut;
	public command_handler: CommandHandler;
	public historyManager: HistoryManager;

	async onload() {
		await this.load_settings();

		this.historyManager = new HistoryManager(this);
		this.historyManager.loadHistoryFromSettings();
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
		(this.settings as any).history = this.historyManager ? this.historyManager.getHistory() : [];
		await this.saveData(this.settings);
	}

	async load_settings(): Promise<void> {
		const savedData = await this.loadData();
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			savedData || {}
		);
	}
}
