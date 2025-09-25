import NoteMoverShortcutPlugin from "main";
import { App, Setting } from "obsidian";
import { FolderSuggest } from "../suggesters/FolderSuggest";
import { createError, handleError } from "src/utils/Error";
import { SETTINGS_CONSTANTS } from "../../config/constants";

export class RulesSettingsSection {
	constructor(
		private plugin: NoteMoverShortcutPlugin,
		private containerEl: HTMLElement,
		private refreshDisplay: () => void
	) {}

	addRulesSetting(): void {
		new Setting(this.containerEl).setName('Rules').setHeading();

		const descUseRules = document.createDocumentFragment();
		descUseRules.append(
			'The NoteMover will move files to the folder associated with the specified criteria.',
			document.createElement('br'),
			'Criteria can be tags, filenames, paths, content, properties, or dates. If multiple rules match, the first one will be applied.',
		);

		new Setting(this.containerEl)
			.setName('Rules description')
			.setDesc(descUseRules);

		const descOnlyMoveWithRules = document.createDocumentFragment();
		descOnlyMoveWithRules.append(
			'When enabled, only files that match defined rules will be moved. Files without matching rules will be left untouched.',
			document.createElement('br'),
			'When disabled, files without matching rules will be moved to the root folder.',
		);

		new Setting(this.containerEl)
			.setName('Only move files with rules')
			.setDesc(descOnlyMoveWithRules)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.onlyMoveNotesWithRules)
				.onChange(async (value) => {
					this.plugin.settings.onlyMoveNotesWithRules = value;
					await this.plugin.save_settings();
					// Update RuleManager
					this.plugin.noteMover.updateRuleManager();
				})
			);
	}

	addAddRuleButtonSetting(): void {
		new Setting(this.containerEl)
			.addButton(btn => btn
				.setButtonText('Add new rule')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.rules.push({ criteria: '', path: '' });
					await this.plugin.save_settings();
					// Update RuleManager
					this.plugin.noteMover.updateRuleManager();
					this.refreshDisplay();
				})
			);
	}

	addRulesArray(): void {
		this.plugin.settings.rules.forEach((rule, index) => {
			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					// AdvancedSuggest instead of TagSuggest
					new (require("../suggesters/AdvancedSuggest")).AdvancedSuggest(this.app, cb.inputEl);
					cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.CRITERIA)
						.setValue(rule.criteria)
						.onChange(async (value) => {
							if (value && this.plugin.settings.rules.some(
								(rule) => rule.criteria === value
							)
							) {
								handleError(
									createError("This criteria already has a folder associated with it"),
									"Rules setting",
									false
								);
								return;
							}

							// Save Setting
							this.plugin.settings.rules[index].criteria = value;
							await this.plugin.save_settings();
							// Update RuleManager
							this.plugin.noteMover.updateRuleManager();
						});
					// @ts-ignore
					cb.containerEl.addClass("note_mover_search");
				})
				.addSearch((cb) => {
					new FolderSuggest(this.app, cb.inputEl);
					cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.PATH)
						.setValue(rule.path)
						.onChange(async (value) => {
							this.plugin.settings.rules[index].path = value;
							await this.plugin.save_settings();
						});
					// @ts-ignore
					cb.containerEl.addClass("note_mover_search");
				})
				.addExtraButton(btn => btn
					.setIcon('up-chevron-glyph')
					.onClick(() => {
						this.moveRule(index, -1);
					})
				)
				.addExtraButton(btn => btn
					.setIcon('down-chevron-glyph')
					.onClick(() => {
						this.moveRule(index, 1);
					})
				)
				.addExtraButton(btn => btn
					.setIcon('cross')
					.onClick(async () => {
						this.plugin.settings.rules.splice(index, 1);
						await this.plugin.save_settings();
						// Update RuleManager
						this.plugin.noteMover.updateRuleManager();
						this.refreshDisplay();
					})
				);
				s.infoEl.remove();
			});
	}

	moveRule(index: number, direction: number) {
		const newIndex = Math.max(0, Math.min(this.plugin.settings.rules.length - 1, index + direction));
		[this.plugin.settings.rules[index], this.plugin.settings.rules[newIndex]] = [this.plugin.settings.rules[newIndex], this.plugin.settings.rules[index]];
		this.plugin.save_settings();
		this.refreshDisplay();
	}

	private get app(): App {
		return this.plugin.app;
	}
}
