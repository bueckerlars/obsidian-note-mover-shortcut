import NoteMoverShortcutPlugin from "main";
import { PluginSettingTab } from "obsidian";
import { HistoryEntry, BulkOperation } from '../types/HistoryEntry';
import { SETTINGS_CONSTANTS } from "../config/constants";
import {
	FolderSettingsSection,
	PeriodicMovementSettingsSection,
	FilterSettingsSection,
	RulesSettingsSection,
	HistorySettingsSection,
	ImportExportSettingsSection
} from "./sections";

interface Rule {
	criteria: string, // Format: "type: value" (e.g. "tag: #project", "fileName: notes.md")
	path: string,
}

export interface NoteMoverShortcutSettings {
	destination: string,
	inboxLocation: string,
	enablePeriodicMovement: boolean,
	periodicMovementInterval: number,
	enableFilter: boolean,
	filter: string[],
	isFilterWhitelist: boolean,
	enableRules: boolean,
	rules: Rule[],
	onlyMoveNotesWithRules: boolean,
	history?: HistoryEntry[],
	bulkOperations?: BulkOperation[],
	lastSeenVersion?: string,
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings = SETTINGS_CONSTANTS.DEFAULT_SETTINGS;

export class NoteMoverShortcutSettingsTab extends PluginSettingTab {
	private folderSettings: FolderSettingsSection;
	private periodicMovementSettings: PeriodicMovementSettingsSection;
	private filterSettings: FilterSettingsSection;
	private rulesSettings: RulesSettingsSection;
	private historySettings: HistorySettingsSection;
	private importExportSettings: ImportExportSettingsSection;

	constructor(private plugin: NoteMoverShortcutPlugin) {
		super(plugin.app, plugin);
		
		// Initialize section classes
		this.folderSettings = new FolderSettingsSection(plugin, this.containerEl);
		this.periodicMovementSettings = new PeriodicMovementSettingsSection(plugin, this.containerEl, () => this.display());
		this.filterSettings = new FilterSettingsSection(plugin, this.containerEl, () => this.display());
		this.rulesSettings = new RulesSettingsSection(plugin, this.containerEl, () => this.display());
		this.historySettings = new HistorySettingsSection(plugin, this.containerEl);
		this.importExportSettings = new ImportExportSettingsSection(plugin, this.containerEl, () => this.display());
	}

	display(): void {
		this.containerEl.empty();

		// Update containerEl references for all sections
		this.folderSettings = new FolderSettingsSection(this.plugin, this.containerEl);
		this.periodicMovementSettings = new PeriodicMovementSettingsSection(this.plugin, this.containerEl, () => this.display());
		this.filterSettings = new FilterSettingsSection(this.plugin, this.containerEl, () => this.display());
		this.rulesSettings = new RulesSettingsSection(this.plugin, this.containerEl, () => this.display());
		this.historySettings = new HistorySettingsSection(this.plugin, this.containerEl);
		this.importExportSettings = new ImportExportSettingsSection(this.plugin, this.containerEl, () => this.display());

		this.folderSettings.addInboxFolderSetting();
		this.folderSettings.addTargetFolderSetting();

		this.periodicMovementSettings.addPeriodicMovementSetting();

		this.filterSettings.addFilterSettings();

		this.rulesSettings.addRulesSetting();
		if (this.plugin.settings.enableRules) {
			this.rulesSettings.addRulesArray();
			this.rulesSettings.addAddRuleButtonSetting();
		}

		this.historySettings.addHistorySettings();

		this.importExportSettings.addImportExportSettings();
	}

}
