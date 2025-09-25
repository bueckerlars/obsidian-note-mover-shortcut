import NoteMoverShortcutPlugin from "main";
import { App, Setting } from "obsidian";
import { ConfirmModal } from "../../modals/ConfirmModal";
import { SETTINGS_CONSTANTS } from "../../config/constants";

export class HistorySettingsSection {
	constructor(
		private plugin: NoteMoverShortcutPlugin,
		private containerEl: HTMLElement
	) {}

	addHistorySettings(): void {
		new Setting(this.containerEl).setName('History').setHeading();

		new Setting(this.containerEl)
			.setName('Clear history')
			.setDesc('Clears the history of moved notes')
			.addButton(btn => btn
				.setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY)
				.setWarning()
				.onClick(async () => {
					const confirmed = await ConfirmModal.show(this.app, {
						title: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_TITLE,
						message: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_MESSAGE,
						confirmText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CONFIRM,
						cancelText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CANCEL,
						danger: true
					});
					
					if (confirmed) {
						await this.plugin.historyManager.clearHistory();
					}
				})
			);
	}

	private get app(): App {
		return this.plugin.app;
	}
}
