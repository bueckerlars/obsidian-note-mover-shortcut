import { Plugin } from 'obsidian';
import { NoteMoverShortcut } from 'src/core/NoteMoverShortcut';
import { CommandHandler } from 'src/handlers/CommandHandler';
import { DEFAULT_SETTINGS, NoteMoverShortcutSettings, NoteMoverShortcutSettingsTab } from "src/settings/Settings";
import { HistoryManager } from 'src/core/HistoryManager';
import { HistoryModal } from 'src/modals/HistoryModal';

export default class NoteMoverShortcutPlugin extends Plugin {
	public settings: NoteMoverShortcutSettings;
	public noteMover: NoteMoverShortcut;
	public command_handler: CommandHandler;
	public historyManager: HistoryManager;

	async onload() {
		await this.load_settings();

		this.historyManager = new HistoryManager(this);
		this.noteMover = new NoteMoverShortcut(this);
		this.command_handler = new CommandHandler(this);
		this.command_handler.setup();

		const ribbonIconEl = this.addRibbonIcon('book-plus', 'NoteMover', (evt: MouseEvent) => {
			this.noteMover.moveFocusedNoteToDestination();
		});

		this.addCommand({
			id: 'show-history',
			name: 'Verlauf anzeigen',
			callback: () => {
				new HistoryModal(this.app, this.historyManager, async (entryId) => {
					await this.historyManager.undoEntry(entryId);
				}).open();
			}
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
