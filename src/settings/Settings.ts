import NoteMoverShortcutPlugin from "main";
import { PluginSettingTab, App, Setting } from "obsidian";
import { FolderSuggest } from "./suggesters/FolderSuggest";
import { TagSuggest } from "./suggesters/TagSuggest";
import { NoteMoverError } from "src/utils/Error";
import { log_error } from "src/utils/Log";
import { v4 as uuidv4 } from 'uuid';
import { InboxSettings } from "./components/InboxSettings";
import { PeriodicMovementSettings } from "./components/PeriodicMovementSettings";
import { FilterSettings } from "./components/FilterSettings";
import { RulesSettings } from "./components/RulesSettings";
import { HistorySettings } from "./components/HistorySettings";

export interface BaseRule {
	id: string;
	type: 'rule' | 'and' | 'or';
}

export interface TagRule extends BaseRule {
	type: 'rule';
	tag: string;
	path: string;
	condition?: {
		dateCondition?: {
			type: 'created' | 'modified';
			operator: 'olderThan' | 'newerThan';
			days: number;
		};
		contentCondition?: {
			operator: 'contains' | 'notContains';
			text: string;
		};
	};
}

export interface GroupRule extends BaseRule {
	type: 'and' | 'or';
	rules: Rule[];
}

export type Rule = TagRule | GroupRule;

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
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings = {
	destination: '/',
	inboxLocation: '',
	enablePeriodicMovement: false,
	periodicMovementInterval: 5,
	enableFilter: false,
	filter: [],
	isFilterWhitelist: false,
	enableRules: false,
	rules: [],
}

export class NoteMoverShortcutSettingsTab extends PluginSettingTab {
	private inboxSettings: InboxSettings;
	private periodicMovementSettings: PeriodicMovementSettings;
	private filterSettings: FilterSettings;
	private rulesSettings: RulesSettings;
	private historySettings: HistorySettings;

	constructor(private plugin: NoteMoverShortcutPlugin) {
		super(plugin.app, plugin);
		
		this.inboxSettings = new InboxSettings(this.containerEl, this.app, this.plugin);
		this.periodicMovementSettings = new PeriodicMovementSettings(this.containerEl, this.plugin);
		this.filterSettings = new FilterSettings(this.containerEl, this.app, this.plugin);
		this.rulesSettings = new RulesSettings(this.containerEl, this.app, this.plugin);
		this.historySettings = new HistorySettings(this.containerEl, this.plugin);
	}

	display(): void {
		this.containerEl.empty();

		this.inboxSettings.display();
		this.periodicMovementSettings.display();
		this.filterSettings.display();
		this.rulesSettings.display();
		this.historySettings.display();
	}

	add_inbox_folder_setting(): void {
		new Setting(this.containerEl)
			.setName('Inbox folder')
			.setDesc('Set your inbox folder')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.inboxLocation)
					.onChange((new_folder) => {
						this.plugin.settings.inboxLocation = new_folder;
						this.plugin.save_settings();
					});
			});
	}

	add_target_folder_setting(): void {
		new Setting(this.containerEl)
			.setName('Note folder')
			.setDesc('Set your main note folder')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.destination)
					.onChange((new_folder) => {
						this.plugin.settings.destination = new_folder;
						this.plugin.save_settings();
					});
			});
	}

	add_periodic_movement_setting(): void {
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

	add_filter_settings(): void {
		// Filter settings
		new Setting(this.containerEl).setName('Filter').setHeading();

		new Setting(this.containerEl)
			.setName('Enable filter')
			.setDesc('Enable the filter')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFilter)
				.onChange(async (value) => {
					this.plugin.settings.enableFilter = value;
					await this.plugin.save_settings();
					this.display();
				})
			);

		if (this.plugin.settings.enableFilter) {
			new Setting(this.containerEl)
			.setName('Toggle blacklist/whitelist')
			.setDesc('Toggle between a blacklist or a whitelist')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isFilterWhitelist)
				.onChange(async (value) => {
					this.plugin.settings.isFilterWhitelist = value;
					await this.plugin.save_settings();
				})
			);
	
			this.add_periodic_movement_filter_array();
	
			new Setting(this.containerEl)
				.addButton(btn => btn
					.setButtonText('Add new filter')
					.setCta()
					.onClick(async () => {
						this.plugin.settings.filter.push('');
						await this.plugin.save_settings();
						this.display();
					})
				);
		}

	}

	add_periodic_movement_filter_array(): void {
		this.plugin.settings.filter.forEach((filter, index) => {
			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					new TagSuggest(this.app, cb.inputEl);
					cb.setPlaceholder('Tag')
						.setValue(filter)
						.onChange(async (value) => {
							this.plugin.settings.filter[index] = value;
							await this.plugin.save_settings();
						});
					// @ts-ignore
					cb.containerEl.addClass("note_mover_search");
				})
				.addExtraButton(btn => btn
					.setIcon('up-chevron-glyph')
					.onClick(() => {
						this.moveFilter(index, -1);
					})
				)
				.addExtraButton(btn => btn
					.setIcon('down-chevron-glyph')
					.onClick(() => {
						this.moveFilter(index, 1);
					})
				)
				.addExtraButton(btn => btn
					.setIcon('cross')
					.onClick(async () => {
						this.plugin.settings.filter.splice(index, 1);
						await this.plugin.save_settings();
						this.display();
					})
				);
				s.infoEl.remove();
		});
	}

	add_rules_setting(): void {
		new Setting(this.containerEl).setName('Rules').setHeading();

		const descUseRules = document.createDocumentFragment();
		descUseRules.append(
			'When enabled, the NoteMover will move notes to the folder associated with the tag.',
			document.createElement('br'),
			'If a note contains more than one tag associated with a rule, the first rule will be applied.',
		);

		new Setting(this.containerEl)
			.setName('Enable rules')
			.setDesc(descUseRules)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableRules)
				.onChange(async (value) => {
					this.plugin.settings.enableRules = value;
					await this.plugin.save_settings();
					this.display();
				})
			);
	}

	add_add_rule_button_setting(): void {
		const container = this.containerEl.createDiv('note-mover-add-rule-buttons');
		
		new Setting(container)
			.addButton(btn => btn
				.setButtonText('Add Rule')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.rules.push(this.createNewRule('rule'));
					await this.plugin.save_settings();
					this.display();
				})
			)
			.addButton(btn => btn
				.setButtonText('Add AND Group')
				.onClick(async () => {
					this.plugin.settings.rules.push(this.createNewRule('and'));
					await this.plugin.save_settings();
					this.display();
				})
			)
			.addButton(btn => btn
				.setButtonText('Add OR Group')
				.onClick(async () => {
					this.plugin.settings.rules.push(this.createNewRule('or'));
					await this.plugin.save_settings();
					this.display();
				})
			);
	}

	add_rules_array(): void {
		this.plugin.settings.rules.forEach((rule, index) => {
			this.renderRule(rule, index);
		});
	}

	private renderRule(rule: Rule, index: number, parentId?: string, indentLevel: number = 0, targetContainer?: HTMLElement): void {
		const container = (targetContainer ?? this.containerEl).createDiv('note-mover-rule-container');
		container.style.display = 'flex';
		container.style.alignItems = 'start';
		container.style.marginLeft = `${indentLevel * 32}px`;
		container.style.marginBottom = '4px';
		container.style.padding = '0 24px 0 12px';

		if (rule.type === 'rule') {
			this.renderTagRule(rule, index, container, parentId);
		} else {
			this.renderGroupRule(rule, index, container, parentId, indentLevel);
		}
	}

	private renderTagRule(rule: TagRule, index: number, container: HTMLElement, parentId?: string): void {
		container.style.display = 'flex';
		container.style.alignItems = 'start';
		container.style.marginBottom = '4px';
		container.style.padding = '0 24px 0 12px';
		container.style.width = '100%';
		container.style.boxSizing = 'border-box';

		// Tag
		const tagInput = document.createElement('input');
		tagInput.type = 'text';
		tagInput.placeholder = 'Tag';
		tagInput.value = rule.tag;
		tagInput.style.width = '120px';
		tagInput.style.marginRight = '8px';
		tagInput.onchange = async (e) => {
			rule.tag = (e.target as HTMLInputElement).value;
			await this.plugin.save_settings();
		};
		container.appendChild(tagInput);

		// Path
		const pathInput = document.createElement('input');
		pathInput.type = 'text';
		pathInput.placeholder = 'Path';
		pathInput.value = rule.path;
		pathInput.style.width = '120px';
		pathInput.style.marginRight = '8px';
		pathInput.onchange = async (e) => {
			rule.path = (e.target as HTMLInputElement).value;
			await this.plugin.save_settings();
		};
		container.appendChild(pathInput);

		// Date Condition Badge
		if (rule.condition?.dateCondition) {
			const badge = document.createElement('span');
			badge.className = 'note-mover-badge';
			badge.textContent = `🗓 ${rule.condition.dateCondition.operator === 'olderThan' ? '>' : '<'} ${rule.condition.dateCondition.days}d`;
			badge.title = `${rule.condition.dateCondition.operator === 'olderThan' ? 'Älter als' : 'Jünger als'} ${rule.condition.dateCondition.days} Tage (${rule.condition.dateCondition.type === 'created' ? 'Erstellt' : 'Geändert'})`;
			badge.style.background = '#444';
			badge.style.color = '#fff';
			badge.style.borderRadius = '8px';
			badge.style.padding = '2px 8px';
			badge.style.marginRight = '8px';
			container.appendChild(badge);
		}

		// Content Condition Badge
		if (rule.condition?.contentCondition) {
			const badge = document.createElement('span');
			badge.className = 'note-mover-badge';
			badge.textContent = `🔍 ${rule.condition.contentCondition.operator === 'contains' ? 'enthält' : 'enthält nicht'}: ${rule.condition.contentCondition.text}`;
			badge.title = `Inhalt ${rule.condition.contentCondition.operator === 'contains' ? 'enthält' : 'enthält nicht'}: ${rule.condition.contentCondition.text}`;
			badge.style.background = '#444';
			badge.style.color = '#fff';
			badge.style.borderRadius = '8px';
			badge.style.padding = '2px 8px';
			badge.style.marginRight = '8px';
			container.appendChild(badge);
		}

		// Spacer, damit die Buttons immer ganz rechts sind
		const spacer = document.createElement('div');
		spacer.style.flex = '1 1 auto';
		container.appendChild(spacer);

		// Buttons
		const btnContainer = document.createElement('div');
		btnContainer.style.display = 'flex';
		btnContainer.style.gap = '4px';

		const upBtn = document.createElement('button');
		upBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 4l4 6H4z" fill="currentColor"/></svg>';
		upBtn.title = 'Regel nach oben';
		upBtn.className = 'clickable-icon';
		upBtn.onclick = () => this.moveRule(index, -1, parentId);
		btnContainer.appendChild(upBtn);

		const downBtn = document.createElement('button');
		downBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 12l-4-6h8z" fill="currentColor"/></svg>';
		downBtn.title = 'Regel nach unten';
		downBtn.className = 'clickable-icon';
		downBtn.onclick = () => this.moveRule(index, 1, parentId);
		btnContainer.appendChild(downBtn);

		const delBtn = document.createElement('button');
		delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
		delBtn.title = 'Regel löschen';
		delBtn.className = 'clickable-icon';
		delBtn.onclick = async () => {
			if (parentId) {
				const parentRule = this.findRuleById(parentId) as GroupRule;
				parentRule.rules.splice(index, 1);
			} else {
				this.plugin.settings.rules.splice(index, 1);
			}
			await this.plugin.save_settings();
			this.display();
		};
		btnContainer.appendChild(delBtn);

		container.appendChild(btnContainer);
	}

	private renderGroupRule(rule: GroupRule, index: number, container: HTMLElement, parentId?: string, indentLevel: number = 0): void {
		// Gruppen-Container
		container.style.background = 'var(--background-secondary)';
		container.style.border = '1px solid var(--background-modifier-border)';
		container.style.borderRadius = '8px';
		container.style.padding = '12px 12px 8px 12px';
		container.style.marginBottom = '12px';
		container.style.marginLeft = `${indentLevel * 24}px`;
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.width = '100%';
		container.style.boxSizing = 'border-box';

		// Header-Zeile (Typ + Add-Buttons + Move/Delete)
		const headerRow = document.createElement('div');
		headerRow.style.display = 'flex';
		headerRow.style.alignItems = 'center';
		headerRow.style.marginBottom = '4px';
		headerRow.style.width = '100%';

		const groupLabel = document.createElement('span');
		groupLabel.textContent = rule.type.toUpperCase();
		groupLabel.style.fontWeight = 'bold';
		groupLabel.style.marginRight = '16px';
		headerRow.appendChild(groupLabel);

		const addRuleBtn = document.createElement('button');
		addRuleBtn.textContent = 'Add Rule';
		addRuleBtn.title = 'Add rule to this group';
		addRuleBtn.className = 'mod-cta';
		addRuleBtn.style.marginRight = '8px';
		addRuleBtn.onclick = async () => {
			rule.rules.push(this.createNewRule('rule'));
			await this.plugin.save_settings();
			this.display();
		};
		headerRow.appendChild(addRuleBtn);

		const addGroupBtn = document.createElement('button');
		if (rule.type === 'and') {
			addGroupBtn.textContent = 'Add OR Group';
			addGroupBtn.title = 'Add OR group as subgroup';
		} else {
			addGroupBtn.textContent = 'Add AND Group';
			addGroupBtn.title = 'Add AND group as subgroup';
		}
		addGroupBtn.className = 'mod-cta';
		addGroupBtn.style.marginRight = '16px';
		addGroupBtn.onclick = async () => {
			rule.rules.push(this.createNewRule(rule.type === 'and' ? 'or' : 'and'));
			await this.plugin.save_settings();
			this.display();
		};
		headerRow.appendChild(addGroupBtn);

		// Spacer, damit die Action-Buttons immer ganz rechts sind
		const spacer = document.createElement('div');
		spacer.style.flex = '1 1 auto';
		spacer.style.marginLeft = 'auto';
		headerRow.appendChild(spacer);

		const upBtn = document.createElement('button');
		upBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 4l4 6H4z" fill="currentColor"/></svg>';
		upBtn.title = 'Move group up';
		upBtn.className = 'clickable-icon';
		upBtn.style.marginRight = '2px';
		upBtn.style.minWidth = '32px';
		upBtn.onclick = () => this.moveRule(index, -1, parentId);
		headerRow.appendChild(upBtn);

		const downBtn = document.createElement('button');
		downBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 12l-4-6h8z" fill="currentColor"/></svg>';
		downBtn.title = 'Move group down';
		downBtn.className = 'clickable-icon';
		downBtn.style.marginRight = '2px';
		downBtn.style.minWidth = '32px';
		downBtn.onclick = () => this.moveRule(index, 1, parentId);
		headerRow.appendChild(downBtn);

		const delBtn = document.createElement('button');
		delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
		delBtn.title = 'Delete group';
		delBtn.className = 'clickable-icon';
		delBtn.style.minWidth = '32px';
		delBtn.onclick = async () => {
			if (parentId) {
				const parentRule = this.findRuleById(parentId) as GroupRule;
				parentRule.rules.splice(index, 1);
			} else {
				this.plugin.settings.rules.splice(index, 1);
			}
			await this.plugin.save_settings();
			this.display();
		};
		headerRow.appendChild(delBtn);

		container.appendChild(headerRow);

		// Separator unter dem Header
		const separator = document.createElement('div');
		separator.style.width = '100%';
		separator.style.height = '1px';
		separator.style.background = 'var(--background-modifier-border)';
		separator.style.margin = '0 0 8px 0';
		container.appendChild(separator);

		// Child rules (alle unter dem Header, untereinander)
		const childrenContainer = document.createElement('div');
		childrenContainer.style.width = '100%';
		childrenContainer.style.display = 'flex';
		childrenContainer.style.flexDirection = 'column';
		childrenContainer.style.gap = '4px';
		for (let i = 0; i < rule.rules.length; i++) {
			const childRuleContainer = document.createElement('div');
			childrenContainer.appendChild(childRuleContainer);
			this.renderRule(rule.rules[i], i, rule.id, indentLevel + 1, childRuleContainer);
		}
		container.appendChild(childrenContainer);
	}

	private findRuleById(id: string): Rule | undefined {
		const findInRules = (rules: Rule[]): Rule | undefined => {
			for (const rule of rules) {
				if (rule.id === id) return rule;
				if (rule.type === 'and' || rule.type === 'or') {
					const found = findInRules(rule.rules);
					if (found) return found;
				}
			}
			return undefined;
		};
		return findInRules(this.plugin.settings.rules);
	}

	private moveRule(index: number, direction: number, parentId?: string): void {
		const rules = parentId 
			? (this.findRuleById(parentId) as GroupRule).rules 
			: this.plugin.settings.rules;
		
		const newIndex = Math.max(0, Math.min(rules.length - 1, index + direction));
		[rules[index], rules[newIndex]] = [rules[newIndex], rules[index]];
		this.plugin.save_settings();
		this.display();
	}

	moveFilter(index: number, direction: number) {
		const newIndex = Math.max(0, Math.min(this.plugin.settings.filter.length - 1, index + direction));
		[this.plugin.settings.filter[index], this.plugin.settings.filter[newIndex]] = [this.plugin.settings.filter[newIndex], this.plugin.settings.filter[index]];
		this.plugin.save_settings();
		this.display();
	}

	private generateId(): string {
		return uuidv4();
	}

	private createNewRule(type: 'rule' | 'and' | 'or'): Rule {
		if (type === 'rule') {
			return {
				id: this.generateId(),
				type: 'rule',
				tag: '',
				path: ''
			};
		} else {
			return {
				id: this.generateId(),
				type,
				rules: [
					{
						id: this.generateId(),
						type: 'rule',
						tag: '',
						path: ''
					},
					{
						id: this.generateId(),
						type: 'rule',
						tag: '',
						path: ''
					}
				]
			};
		}
	}

	createGroupRule(type: 'and' | 'or'): GroupRule {
		return {
			id: crypto.randomUUID(),
			type,
			rules: [
				{
					id: crypto.randomUUID(),
					type: 'rule',
					tag: '',
					path: ''
				},
				{
					id: crypto.randomUUID(),
					type: 'rule',
					tag: '',
					path: ''
				}
			]
		};
	}
}
