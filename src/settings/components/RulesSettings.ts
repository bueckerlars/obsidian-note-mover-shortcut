import { App, Setting } from "obsidian";
import NoteMoverShortcutPlugin from "main";
import { Rule, GroupRule, TagRule, createNewRule } from "../types";
import { TagSuggest } from "../suggesters/TagSuggest";
import { FolderSuggest } from "../suggesters/FolderSuggest";

export class RulesSettings {
    private readonly INDENT_SIZE = 24;
    private readonly RULE_SPACING = 8;
    private readonly GROUP_PADDING = 16;
    private readonly INPUT_WIDTH = '120px';
    private readonly BADGE_STYLES = {
        background: 'var(--background-modifier-border)',
        color: 'var(--text-normal)',
        borderRadius: '4px',
        padding: '2px 8px',
        marginRight: '8px',
        fontSize: '0.9em'
    };

    constructor(
        private containerEl: HTMLElement,
        private app: App,
        private plugin: NoteMoverShortcutPlugin
    ) {}

    display(): void {
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

        if (this.plugin.settings.enableRules) {
            this.add_rules_array();
            this.add_add_rule_button_setting();
        }
    }

    private add_rules_array(): void {
        this.plugin.settings.rules.forEach((rule, index) => {
            this.renderRule(rule, index);
        });
    }

    private add_add_rule_button_setting(): void {
        const container = this.containerEl.createDiv('note-mover-add-rule-buttons');
        
        new Setting(container)
            .addButton(btn => btn
                .setButtonText('Add Rule')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.rules.push(createNewRule('rule'));
                    await this.plugin.save_settings();
                    this.display();
                })
            )
            .addButton(btn => btn
                .setButtonText('Add AND Group')
                .onClick(async () => {
                    this.plugin.settings.rules.push(createNewRule('and'));
                    await this.plugin.save_settings();
                    this.display();
                })
            )
            .addButton(btn => btn
                .setButtonText('Add OR Group')
                .onClick(async () => {
                    this.plugin.settings.rules.push(createNewRule('or'));
                    await this.plugin.save_settings();
                    this.display();
                })
            );
    }

    private renderRule(rule: Rule, index: number, parentId?: string, indentLevel: number = 0, targetContainer?: HTMLElement): void {
        const container = (targetContainer ?? this.containerEl).createDiv('note-mover-rule-container');
        container.style.cssText = `
            display: flex;
            align-items: start;
            margin-left: ${indentLevel * this.INDENT_SIZE}px;
            margin-bottom: ${this.RULE_SPACING}px;
            width: 100%;
            box-sizing: border-box;
        `;

        if (rule.type === 'rule') {
            this.renderTagRule(rule, index, container, parentId);
        } else {
            this.renderGroupRule(rule, index, container, parentId, indentLevel);
        }
    }

    private renderTagRule(rule: TagRule, index: number, container: HTMLElement, parentId?: string): void {
        container.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: var(--background-primary);
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
            flex-wrap: wrap;
        `;

        // Tag Input
        const tagInput = document.createElement('input');
        tagInput.type = 'text';
        tagInput.placeholder = 'Tag';
        tagInput.value = rule.tag;
        tagInput.style.cssText = `
            width: ${this.INPUT_WIDTH};
            min-width: 100px;
            flex: 0 0 auto;
        `;
        tagInput.onchange = async (e) => {
            rule.tag = (e.target as HTMLInputElement).value;
            await this.plugin.save_settings();
        };
        // Initialize TagSuggest for the tag input
        new TagSuggest(this.app, tagInput);
        container.appendChild(tagInput);

        // Path Input
        const pathInput = document.createElement('input');
        pathInput.type = 'text';
        pathInput.placeholder = 'Path';
        pathInput.value = rule.path;
        pathInput.style.cssText = `
            width: ${this.INPUT_WIDTH};
            min-width: 100px;
            flex: 0 0 auto;
        `;
        pathInput.onchange = async (e) => {
            rule.path = (e.target as HTMLInputElement).value;
            await this.plugin.save_settings();
        };
        // Initialize FolderSuggest for the path input
        new FolderSuggest(this.app, pathInput);
        container.appendChild(pathInput);

        // Conditions Container
        const conditionsContainer = document.createElement('div');
        conditionsContainer.style.cssText = `
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            flex: 1 1 auto;
            min-width: 0;
        `;

        // Date Condition Badge
        if (rule.condition?.dateCondition) {
            const badge = document.createElement('span');
            badge.className = 'note-mover-badge';
            badge.textContent = `🗓 ${rule.condition.dateCondition.operator === 'olderThan' ? '>' : '<'} ${rule.condition.dateCondition.days}d`;
            badge.title = `${rule.condition.dateCondition.operator === 'olderThan' ? 'Älter als' : 'Jünger als'} ${rule.condition.dateCondition.days} Tage (${rule.condition.dateCondition.type === 'created' ? 'Erstellt' : 'Geändert'})`;
            Object.assign(badge.style, this.BADGE_STYLES);
            conditionsContainer.appendChild(badge);
        }

        // Content Condition Badge
        if (rule.condition?.contentCondition) {
            const badge = document.createElement('span');
            badge.className = 'note-mover-badge';
            badge.textContent = `🔍 ${rule.condition.contentCondition.operator === 'contains' ? 'enthält' : 'enthält nicht'}: ${rule.condition.contentCondition.text}`;
            badge.title = `Inhalt ${rule.condition.contentCondition.operator === 'contains' ? 'enthält' : 'enthält nicht'}: ${rule.condition.contentCondition.text}`;
            Object.assign(badge.style, this.BADGE_STYLES);
            conditionsContainer.appendChild(badge);
        }

        container.appendChild(conditionsContainer);

        // Buttons Container
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = `
            display: flex;
            gap: 4px;
            flex: 0 0 auto;
            margin-left: auto;
        `;

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
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            background: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: ${this.GROUP_PADDING}px;
            margin-bottom: ${this.RULE_SPACING}px;
            width: 100%;
            box-sizing: border-box;
        `;

        // Header Row
        const headerRow = document.createElement('div');
        headerRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: ${this.RULE_SPACING}px;
            flex-wrap: wrap;
        `;

        const groupLabel = document.createElement('span');
        groupLabel.textContent = rule.type.toUpperCase();
        groupLabel.style.cssText = `
            font-weight: bold;
            flex: 0 0 auto;
        `;
        headerRow.appendChild(groupLabel);

        const addRuleBtn = document.createElement('button');
        addRuleBtn.textContent = 'Add Rule';
        addRuleBtn.title = 'Add rule to this group';
        addRuleBtn.className = 'mod-cta';
        addRuleBtn.style.marginRight = '8px';
        addRuleBtn.onclick = async () => {
            rule.rules.push(createNewRule('rule'));
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
            rule.rules.push(createNewRule(rule.type === 'and' ? 'or' : 'and'));
            await this.plugin.save_settings();
            this.display();
        };
        headerRow.appendChild(addGroupBtn);

        // Spacer
        const spacer = document.createElement('div');
        spacer.style.cssText = `
            flex: 1 1 auto;
            margin-left: auto;
        `;
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

        // Separator
        const separator = document.createElement('div');
        separator.style.cssText = `
            width: 100%;
            height: 1px;
            background: var(--background-modifier-border);
            margin-bottom: ${this.RULE_SPACING}px;
        `;
        container.appendChild(separator);

        // Children Container
        const childrenContainer = document.createElement('div');
        childrenContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: ${this.RULE_SPACING}px;
            width: 100%;
        `;

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
} 