import { Plugin, TFile } from 'obsidian';
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
		
		// Event-Listener für automatische History-Erstellung bei manuellen Dateioperationen
		this.setupVaultEventListeners();
	}

	onunload() {
		// Event-Listener werden automatisch beim Plugin unload entfernt
	}

	/**
	 * Einrichtung der Event-Listener für automatische History-Erstellung
	 */
	private setupVaultEventListeners(): void {
		// Überwache Dateiumbenennung/verschiebung
		this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
			// Nur bei Markdown-Dateien
			if (file instanceof TFile && file.extension === 'md') {
				this.historyManager.addEntryFromVaultEvent(
					oldPath,
					file.path,
					file.name
				);
			}
		}));
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
