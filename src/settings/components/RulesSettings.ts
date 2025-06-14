import { App, Setting } from "obsidian";
import NoteMoverShortcutPlugin from "main";
import { Rule, createNewRule } from "../types";
import { TagRuleComponent } from "./rules/TagRuleComponent";
import { GroupRuleComponent } from "./rules/GroupRuleComponent";

export class RulesSettings {
    private tagRuleComponent: TagRuleComponent;
    private groupRuleComponent: GroupRuleComponent;
    private rulesContainer: HTMLElement;

    constructor(
        private containerEl: HTMLElement,
        private app: App,
        private plugin: NoteMoverShortcutPlugin
    ) {
        this.tagRuleComponent = new TagRuleComponent(
            app,
            async () => await this.plugin.save_settings(),
            async (index: number, direction: number, parentId?: string) => await this.moveRule(index, direction, parentId),
            async (index: number, parentId?: string) => await this.deleteRule(index, parentId)
        );
        this.groupRuleComponent = new GroupRuleComponent(
            app,
            async () => await this.plugin.save_settings(),
            this.tagRuleComponent,
            async (index: number, direction: number, parentId?: string) => await this.moveRule(index, direction, parentId),
            async (index: number, parentId?: string) => await this.deleteRule(index, parentId),
            () => this.display()
        );
        this.rulesContainer = this.containerEl.createDiv('note-mover-rules-container');
    }

    display(): void {
        // Clear only the rules container
        this.rulesContainer.empty();
        
        const descUseRules = document.createDocumentFragment();
        descUseRules.append(
            'When enabled, the NoteMover will move notes to the folder associated with the tag.',
            document.createElement('br'),
            'If a note contains more than one tag associated with a rule, the first rule will be applied.',
        );

        new Setting(this.rulesContainer)
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
        const rulesContainer = this.rulesContainer.createDiv('note-mover-rules-list');
        this.plugin.settings.rules.forEach((rule, index) => {
            this.renderRule(rule, index, undefined, 0, rulesContainer);
        });
    }

    private add_add_rule_button_setting(): void {
        const container = this.rulesContainer.createDiv('note-mover-add-rule-buttons');
        
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
        const container = (targetContainer ?? this.rulesContainer).createDiv('note-mover-rule-container');

        if (rule.type === 'rule') {
            this.tagRuleComponent.renderTagRule(rule, index, container, parentId);
        } else {
            this.groupRuleComponent.renderGroupRule(rule, index, container, parentId, indentLevel);
        }
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

    private async moveRule(index: number, direction: number, parentId?: string): Promise<void> {
        const rules = parentId 
            ? (this.findRuleById(parentId) as any).rules 
            : this.plugin.settings.rules;
        
        const newIndex = Math.max(0, Math.min(rules.length - 1, index + direction));
        [rules[index], rules[newIndex]] = [rules[newIndex], rules[index]];
        await this.plugin.save_settings();
        this.display();
    }

    private async deleteRule(index: number, parentId?: string): Promise<void> {
        const rules = parentId 
            ? (this.findRuleById(parentId) as any).rules 
            : this.plugin.settings.rules;
        
        rules.splice(index, 1);
        await this.plugin.save_settings();
        this.display();
    }
} 