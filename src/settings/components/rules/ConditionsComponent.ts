import { App } from "obsidian";
import { DateCondition, ContentCondition } from "../../types";
import { RULE_STYLES } from "./styles";

interface Conditions {
    dateCondition?: {
        type: 'created' | 'modified';
        operator: 'olderThan' | 'newerThan';
        days: number;
    };
    contentCondition?: {
        operator: 'contains' | 'notContains';
        text: string;
    };
}

export class ConditionsComponent {
    constructor(
        private app: App,
        private onSave: () => Promise<void>
    ) {}

    renderConditions(
        container: HTMLElement,
        conditions: Conditions,
        onUpdate: () => void
    ): void {
        const conditionsContainer = document.createElement('div');
        conditionsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-left: ${RULE_STYLES.INDENT_SIZE}px;
            padding: 8px;
            background: var(--background-secondary);
            border-radius: 4px;
            align-items: stretch;
            width: 100%;
        `;

        // Wrapper für jede einzelne Condition-Zeile
        const wrapRow = (row: HTMLElement) => {
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.width = '100%';
            row.style.background = 'var(--background-primary)';
            row.style.border = '1px solid var(--background-modifier-border)';
            row.style.borderRadius = '4px';
            row.style.padding = '6px 8px';
            row.style.marginBottom = '4px';

            // Inputs/Labels links gruppieren
            const left = row.querySelector('.note-mover-condition-left');
            if (left) {
                (left as HTMLElement).style.display = 'flex';
                (left as HTMLElement).style.gap = '4px';
                (left as HTMLElement).style.alignItems = 'center';
            }
            // Remove-Button rechts
            const right = row.querySelector('.note-mover-condition-right');
            if (right) {
                (right as HTMLElement).style.marginLeft = 'auto';
            }
            return row;
        };

        // Date Condition
        if (conditions.dateCondition) {
            const dateRow = document.createElement('div');
            // Inputs/Labels links
            const left = document.createElement('div');
            left.className = 'note-mover-condition-left';
            dateRow.appendChild(left);
            // Remove-Button rechts
            const right = document.createElement('div');
            right.className = 'note-mover-condition-right';
            dateRow.appendChild(right);
            // Render Inputs/Labels in left, Remove in right
            this.renderExistingDateCondition(left, conditions, onUpdate);
            // Move Remove-Button (letztes Child von left) nach right
            if (left.lastChild) right.appendChild(left.lastChild);
            conditionsContainer.appendChild(wrapRow(dateRow));
        }
        // Content Condition
        if (conditions.contentCondition) {
            const contentRow = document.createElement('div');
            const left = document.createElement('div');
            left.className = 'note-mover-condition-left';
            contentRow.appendChild(left);
            const right = document.createElement('div');
            right.className = 'note-mover-condition-right';
            contentRow.appendChild(right);
            this.renderExistingContentCondition(left, conditions, onUpdate);
            if (left.lastChild) right.appendChild(left.lastChild);
            conditionsContainer.appendChild(wrapRow(contentRow));
        }
        // Neue Condition hinzufügen
        this.renderNewConditionRow(conditionsContainer, conditions, onUpdate);

        container.appendChild(conditionsContainer);
    }

    private renderNewConditionRow(
        container: HTMLElement,
        conditions: Conditions,
        onUpdate: () => void
    ): void {
        const newConditionRow = document.createElement('div');
        newConditionRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 8px;
            background: var(--background-secondary);
            border-radius: 4px;
        `;

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
                conditions.dateCondition = {
                    type: 'created',
                    operator: 'olderThan',
                    days: 1
                };
            } else {
                conditions.contentCondition = {
                    operator: 'contains',
                    text: ''
                };
            }
            await this.onSave();
            onUpdate();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        cancelBtn.className = 'clickable-icon';
        cancelBtn.style.cssText = 'margin-left: auto;';
        cancelBtn.onclick = () => {
            // Nur die UI zurücksetzen, ohne bestehende Bedingungen zu löschen
            onUpdate();
        };

        newConditionRow.appendChild(typeSelect);
        newConditionRow.appendChild(addBtn);
        newConditionRow.appendChild(cancelBtn);
        container.appendChild(newConditionRow);
    }

    private renderExistingDateCondition(
        row: HTMLElement,
        conditions: Conditions,
        onUpdate: () => void
    ): void {
        const condition = conditions.dateCondition!;

        // Container für Inputs/Labels
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.gap = '4px';
        inputContainer.style.alignItems = 'center';

        const typeSelect = document.createElement('select');
        typeSelect.style.cssText = `background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 2px 6px;`;
        ['created', 'modified'].forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type === 'created' ? 'Created Date' : 'Modified Date';
            option.selected = type === condition.type;
            typeSelect.appendChild(option);
        });
        typeSelect.onchange = async () => {
            condition.type = typeSelect.value as 'created' | 'modified';
            await this.onSave();
        };
        inputContainer.appendChild(typeSelect);

        const operatorSelect = document.createElement('select');
        operatorSelect.style.cssText = `background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 2px 6px;`;
        ['olderThan', 'newerThan'].forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op === 'olderThan' ? 'Older Than' : 'Newer Than';
            option.selected = op === condition.operator;
            operatorSelect.appendChild(option);
        });
        operatorSelect.onchange = async () => {
            condition.operator = operatorSelect.value as 'olderThan' | 'newerThan';
            await this.onSave();
        };
        inputContainer.appendChild(operatorSelect);

        const daysInput = document.createElement('input');
        daysInput.type = 'number';
        daysInput.placeholder = 'Days';
        daysInput.min = '1';
        daysInput.value = condition.days.toString();
        daysInput.style.cssText = `background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 2px 6px; width: 60px;`;
        daysInput.onchange = async () => {
            const value = parseInt(daysInput.value);
            if (isNaN(value) || value < 1) {
                daysInput.value = condition.days.toString();
                return;
            }
            condition.days = value;
            await this.onSave();
        };
        inputContainer.appendChild(daysInput);

        row.appendChild(inputContainer);

        // Remove-Button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        deleteBtn.className = 'clickable-icon';
        deleteBtn.onclick = async () => {
            delete conditions.dateCondition;
            await this.onSave();
            onUpdate();
        };
        row.appendChild(deleteBtn);
    }

    private renderExistingContentCondition(
        row: HTMLElement,
        conditions: Conditions,
        onUpdate: () => void
    ): void {
        const condition = conditions.contentCondition!;

        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.gap = '4px';
        inputContainer.style.alignItems = 'center';

        const operatorSelect = document.createElement('select');
        operatorSelect.style.cssText = `background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 2px 6px;`;
        ['contains', 'notContains'].forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op === 'contains' ? 'Contains' : 'Not Contains';
            option.selected = op === condition.operator;
            operatorSelect.appendChild(option);
        });
        operatorSelect.onchange = async () => {
            condition.operator = operatorSelect.value as 'contains' | 'notContains';
            await this.onSave();
        };
        inputContainer.appendChild(operatorSelect);

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.placeholder = 'Text';
        textInput.value = condition.text;
        textInput.style.cssText = `background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 2px 6px; width: 200px;`;
        textInput.onchange = async () => {
            condition.text = textInput.value;
            await this.onSave();
        };
        inputContainer.appendChild(textInput);

        row.appendChild(inputContainer);

        // Remove-Button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        deleteBtn.className = 'clickable-icon';
        deleteBtn.onclick = async () => {
            delete conditions.contentCondition;
            await this.onSave();
            onUpdate();
        };
        row.appendChild(deleteBtn);
    }
}