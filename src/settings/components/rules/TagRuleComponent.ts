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
        private onSave: () => Promise<void>,
        private onMove?: (index: number, direction: number, parentId?: string) => Promise<void>,
        private onDelete?: (index: number, parentId?: string) => Promise<void>
    ) {
        this.conditionsComponent = new ConditionsComponent(app, onSave);
    }

    renderTagRule(rule: TagRule, index: number, container: HTMLElement, parentId?: string): void {
        // Hauptcontainer für die Regel
        const ruleContainer = document.createElement('div');
        ruleContainer.style.display = 'flex';
        ruleContainer.style.flexDirection = 'column';
        ruleContainer.style.marginBottom = '8px';
        ruleContainer.style.width = '100%';
        ruleContainer.style.boxSizing = 'border-box';

        // Zeile für Tag, Path und Buttons
        const mainRow = document.createElement('div');
        mainRow.style.display = 'flex';
        mainRow.style.alignItems = 'start';
        mainRow.style.padding = '0 24px 0 12px';
        mainRow.style.width = '100%';
        mainRow.style.boxSizing = 'border-box';

        // Tag
        const tagInput = document.createElement('input');
        tagInput.type = 'text';
        tagInput.placeholder = 'Tag';
        tagInput.value = rule.tag;
        tagInput.style.width = '120px';
        tagInput.style.marginRight = '8px';
        tagInput.onchange = async (e) => {
            rule.tag = (e.target as HTMLInputElement).value;
            await this.onSave();
        };
        new TagSuggest(this.app, tagInput);
        mainRow.appendChild(tagInput);

        // Path
        const pathInput = document.createElement('input');
        pathInput.type = 'text';
        pathInput.placeholder = 'Path';
        pathInput.value = rule.path;
        pathInput.style.width = '120px';
        pathInput.style.marginRight = '8px';
        pathInput.onchange = async (e) => {
            rule.path = (e.target as HTMLInputElement).value;
            await this.onSave();
        };
        new FolderSuggest(this.app, pathInput);
        mainRow.appendChild(pathInput);

        // Spacer
        const spacer = document.createElement('div');
        spacer.style.flex = '1 1 auto';
        mainRow.appendChild(spacer);

        // Buttons
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '4px';

        const addConditionBtn = document.createElement('button');
        addConditionBtn.textContent = 'Add Condition';
        addConditionBtn.title = 'Bedingung hinzufügen';
        addConditionBtn.className = 'mod-cta';
        addConditionBtn.style.marginRight = '8px';
        addConditionBtn.onclick = () => {
            // Erstelle die Auswahlzeile
            const selectionRow = document.createElement('div');
            selectionRow.style.display = 'flex';
            selectionRow.style.alignItems = 'center';
            selectionRow.style.gap = '8px';
            selectionRow.style.padding = '8px 24px 8px 36px';
            selectionRow.style.background = 'var(--background-secondary)';
            selectionRow.style.borderRadius = '4px';
            selectionRow.style.marginTop = '4px';

            const typeSelect = document.createElement('select');
            typeSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
            [
                { value: 'date', label: 'Date Condition' },
                { value: 'content', label: 'Content Condition' }
            ].forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                typeSelect.appendChild(option);
            });

            const addBtn = document.createElement('button');
            addBtn.textContent = 'Add';
            addBtn.className = 'mod-cta';
            addBtn.onclick = async () => {
                if (typeSelect.value === 'date') {
                    if (!rule.condition) {
                        rule.condition = {};
                    }
                    rule.condition.dateCondition = {
                        type: 'created',
                        operator: 'olderThan',
                        days: 1
                    };
                } else {
                    if (!rule.condition) {
                        rule.condition = {};
                    }
                    rule.condition.contentCondition = {
                        operator: 'contains',
                        text: ''
                    };
                }
                await this.onSave();
                // Entferne die Auswahlzeile
                ruleContainer.removeChild(selectionRow);
                // Aktualisiere die Anzeige der Conditions
                this.renderConditions(ruleContainer, rule);
            };

            const cancelBtn = document.createElement('button');
            cancelBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
            cancelBtn.className = 'clickable-icon';
            cancelBtn.onclick = () => {
                // Entferne die Auswahlzeile
                ruleContainer.removeChild(selectionRow);
            };

            selectionRow.appendChild(typeSelect);
            selectionRow.appendChild(addBtn);
            selectionRow.appendChild(cancelBtn);
            ruleContainer.appendChild(selectionRow);
        };
        btnContainer.appendChild(addConditionBtn);

        const upBtn = document.createElement('button');
        upBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 4l4 6H4z" fill="currentColor"/></svg>';
        upBtn.title = 'Regel nach oben';
        upBtn.className = 'clickable-icon';
        upBtn.onclick = async () => {
            if (this.onMove) {
                await this.onMove(index, -1, parentId);
            }
        };
        btnContainer.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 12l-4-6h8z" fill="currentColor"/></svg>';
        downBtn.title = 'Regel nach unten';
        downBtn.className = 'clickable-icon';
        downBtn.onclick = async () => {
            if (this.onMove) {
                await this.onMove(index, 1, parentId);
            }
        };
        btnContainer.appendChild(downBtn);

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        delBtn.title = 'Regel löschen';
        delBtn.className = 'clickable-icon';
        delBtn.onclick = async () => {
            if (this.onDelete) {
                await this.onDelete(index, parentId);
            }
        };
        btnContainer.appendChild(delBtn);

        mainRow.appendChild(btnContainer);
        ruleContainer.appendChild(mainRow);

        // Container für Conditions
        this.renderConditions(ruleContainer, rule);

        container.appendChild(ruleContainer);
    }

    private renderConditions(container: HTMLElement, rule: TagRule): void {
        // Entferne alte Conditions
        const oldConditions = container.querySelector('.note-mover-conditions');
        if (oldConditions) {
            container.removeChild(oldConditions);
        }

        // Erstelle neuen Conditions-Container
        const conditionsContainer = document.createElement('div');
        conditionsContainer.className = 'note-mover-conditions';
        conditionsContainer.style.display = 'flex';
        conditionsContainer.style.flexDirection = 'column';
        conditionsContainer.style.gap = '4px';
        conditionsContainer.style.marginTop = '4px';

        // Date Condition
        if (rule.condition?.dateCondition) {
            const dateRow = document.createElement('div');
            dateRow.style.display = 'flex';
            dateRow.style.alignItems = 'center';
            dateRow.style.gap = '8px';
            dateRow.style.padding = '8px 22px 8px 36px';
            dateRow.style.background = 'var(--background-secondary)';
            dateRow.style.borderRadius = '4px';

            const typeSelect = document.createElement('select');
            typeSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
            ['created', 'modified'].forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type === 'created' ? 'Created Date' : 'Modified Date';
                option.selected = type === rule.condition!.dateCondition!.type;
                typeSelect.appendChild(option);
            });
            typeSelect.onchange = async () => {
                rule.condition!.dateCondition!.type = typeSelect.value as 'created' | 'modified';
                await this.onSave();
            };
            dateRow.appendChild(typeSelect);

            const operatorSelect = document.createElement('select');
            operatorSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
            ['olderThan', 'newerThan'].forEach(op => {
                const option = document.createElement('option');
                option.value = op;
                option.textContent = op === 'olderThan' ? 'Older Than' : 'Newer Than';
                option.selected = op === rule.condition!.dateCondition!.operator;
                operatorSelect.appendChild(option);
            });
            operatorSelect.onchange = async () => {
                rule.condition!.dateCondition!.operator = operatorSelect.value as 'olderThan' | 'newerThan';
                await this.onSave();
            };
            dateRow.appendChild(operatorSelect);

            const daysInput = document.createElement('input');
            daysInput.type = 'number';
            daysInput.placeholder = 'Days';
            daysInput.min = '1';
            daysInput.value = rule.condition!.dateCondition!.days.toString();
            daysInput.style.cssText = RULE_STYLES.SELECT_STYLES;
            daysInput.onchange = async () => {
                rule.condition!.dateCondition!.days = parseInt(daysInput.value);
                await this.onSave();
            };
            dateRow.appendChild(daysInput);

            // Spacer für den Löschen-Button
            const spacer = document.createElement('div');
            spacer.style.flex = '1 1 auto';
            dateRow.appendChild(spacer);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
            deleteBtn.title = 'Bedingung löschen';
            deleteBtn.className = 'clickable-icon';
            deleteBtn.style.minWidth = '32px';
            deleteBtn.onclick = async () => {
                delete rule.condition!.dateCondition;
                if (!rule.condition!.contentCondition) {
                    delete rule.condition;
                }
                await this.onSave();
                this.renderConditions(container, rule);
            };
            dateRow.appendChild(deleteBtn);

            conditionsContainer.appendChild(dateRow);
        }

        // Content Condition
        if (rule.condition?.contentCondition) {
            const contentRow = document.createElement('div');
            contentRow.style.display = 'flex';
            contentRow.style.alignItems = 'center';
            contentRow.style.gap = '8px';
            contentRow.style.padding = '8px 22px 8px 36px';
            contentRow.style.background = 'var(--background-secondary)';
            contentRow.style.borderRadius = '4px';

            const operatorSelect = document.createElement('select');
            operatorSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
            ['contains', 'notContains'].forEach(op => {
                const option = document.createElement('option');
                option.value = op;
                option.textContent = op === 'contains' ? 'Contains' : 'Does Not Contain';
                option.selected = op === rule.condition!.contentCondition!.operator;
                operatorSelect.appendChild(option);
            });
            operatorSelect.onchange = async () => {
                rule.condition!.contentCondition!.operator = operatorSelect.value as 'contains' | 'notContains';
                await this.onSave();
            };
            contentRow.appendChild(operatorSelect);

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.placeholder = 'Text to search for';
            textInput.value = rule.condition!.contentCondition!.text;
            textInput.style.cssText = RULE_STYLES.SELECT_STYLES;
            textInput.onchange = async () => {
                rule.condition!.contentCondition!.text = textInput.value;
                await this.onSave();
            };
            contentRow.appendChild(textInput);

            // Spacer für den Löschen-Button
            const spacer = document.createElement('div');
            spacer.style.flex = '1 1 auto';
            contentRow.appendChild(spacer);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
            deleteBtn.title = 'Bedingung löschen';
            deleteBtn.className = 'clickable-icon';
            deleteBtn.style.minWidth = '32px';
            deleteBtn.onclick = async () => {
                delete rule.condition!.contentCondition;
                if (!rule.condition!.dateCondition) {
                    delete rule.condition;
                }
                await this.onSave();
                this.renderConditions(container, rule);
            };
            contentRow.appendChild(deleteBtn);

            conditionsContainer.appendChild(contentRow);
        }

        container.appendChild(conditionsContainer);
    }

    private findRuleById(id: string): any {
        // This will be implemented by the parent component
        return null;
    }

    private moveRule(index: number, direction: number, parentId?: string): void {
        // This will be implemented by the parent component
    }
} 