import { App } from "obsidian";
import { TagRule } from "../../types";
import { RULE_STYLES } from "./styles";
import { TagSuggest } from "../../suggesters/TagSuggest";
import { FolderSuggest } from "../../suggesters/FolderSuggest";
import { ConditionsComponent } from "./ConditionsComponent";

export class TagRuleComponent {
    private conditionsComponent: ConditionsComponent;

    constructor(
        private app: App,
        private onSave: () => Promise<void>
    ) {
        this.conditionsComponent = new ConditionsComponent(app, onSave);
    }

    renderTagRule(
        rule: TagRule,
        index: number,
        container: HTMLElement,
        parentId?: string
    ): void {
        container.style.cssText = RULE_STYLES.CONTAINER_STYLES;

        // Main row with tag, path and buttons
        const mainRow = document.createElement('div');
        mainRow.style.cssText = RULE_STYLES.MAIN_ROW_STYLES;

        // Tag Input
        const tagInput = document.createElement('input');
        tagInput.type = 'text';
        tagInput.placeholder = 'Tag';
        tagInput.value = rule.tag;
        tagInput.style.cssText = `
            width: ${RULE_STYLES.INPUT_WIDTH};
            min-width: 100px;
            flex: 0 0 auto;
        `;
        tagInput.onchange = async (e) => {
            rule.tag = (e.target as HTMLInputElement).value;
            await this.onSave();
        };
        new TagSuggest(this.app, tagInput);
        mainRow.appendChild(tagInput);

        // Path Input
        const pathInput = document.createElement('input');
        pathInput.type = 'text';
        pathInput.placeholder = 'Path';
        pathInput.value = rule.path;
        pathInput.style.cssText = `
            width: ${RULE_STYLES.INPUT_WIDTH};
            min-width: 100px;
            flex: 0 0 auto;
        `;
        pathInput.onchange = async (e) => {
            rule.path = (e.target as HTMLInputElement).value;
            await this.onSave();
        };
        new FolderSuggest(this.app, pathInput);
        mainRow.appendChild(pathInput);

        // Add Condition Button
        const addConditionBtn = document.createElement('button');
        addConditionBtn.textContent = 'Add Condition';
        addConditionBtn.className = 'mod-cta';
        addConditionBtn.style.cssText = 'flex: 0 0 auto;';
        addConditionBtn.onclick = async () => {
            if (!rule.conditions) {
                rule.conditions = {
                    dateConditions: [],
                    contentConditions: []
                };
            }
            if (!rule.conditions.dateConditions) {
                rule.conditions.dateConditions = [];
            }
            if (!rule.conditions.contentConditions) {
                rule.conditions.contentConditions = [];
            }
            rule.conditions.dateConditions.push({
                type: 'created',
                operator: 'olderThan',
                days: 1,
                isNew: true
            });
            await this.onSave();
            container.empty();
            this.renderTagRule(rule, index, container, parentId);
        };
        mainRow.appendChild(addConditionBtn);

        // Buttons Container
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = RULE_STYLES.BUTTON_CONTAINER_STYLES;

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
                const parentRule = this.findRuleById(parentId);
                if (parentRule && 'rules' in parentRule) {
                    parentRule.rules.splice(index, 1);
                }
            } else {
                // This will be handled by the parent component
            }
            await this.onSave();
        };
        btnContainer.appendChild(delBtn);

        mainRow.appendChild(btnContainer);
        container.appendChild(mainRow);

        // Conditions
        if (rule.conditions) {
            this.conditionsComponent.renderConditions(
                container,
                rule.conditions,
                () => this.renderTagRule(rule, index, container, parentId)
            );
        }
    }

    private findRuleById(id: string): any {
        // This will be implemented by the parent component
        return null;
    }

    private moveRule(index: number, direction: number, parentId?: string): void {
        // This will be implemented by the parent component
    }
} 