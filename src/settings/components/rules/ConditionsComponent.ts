import { App } from "obsidian";
import { DateCondition, ContentCondition } from "../../types";
import { RULE_STYLES } from "./styles";

interface Conditions {
    dateConditions?: DateCondition[];
    contentConditions?: ContentCondition[];
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
        `;

        this.renderDateConditions(conditionsContainer, conditions, onUpdate);
        this.renderContentConditions(conditionsContainer, conditions, onUpdate);
        this.renderNewConditionRow(conditionsContainer, conditions, onUpdate);

        container.appendChild(conditionsContainer);
    }

    private renderDateConditions(
        container: HTMLElement,
        conditions: Conditions,
        onUpdate: () => void
    ): void {
        if (!conditions.dateConditions?.length) return;

        conditions.dateConditions.forEach((condition, index) => {
            const dateRow = document.createElement('div');
            dateRow.style.cssText = RULE_STYLES.MAIN_ROW_STYLES;

            if (condition.isNew) {
                this.renderNewDateConditionInput(dateRow, conditions, index, onUpdate);
            } else {
                this.renderExistingDateCondition(dateRow, conditions, index, onUpdate);
            }

            container.appendChild(dateRow);
        });
    }

    private renderContentConditions(
        container: HTMLElement,
        conditions: Conditions,
        onUpdate: () => void
    ): void {
        if (!conditions.contentConditions?.length) return;

        conditions.contentConditions.forEach((condition, index) => {
            const contentRow = document.createElement('div');
            contentRow.style.cssText = RULE_STYLES.MAIN_ROW_STYLES;

            this.renderExistingContentCondition(contentRow, conditions, index, onUpdate);
            container.appendChild(contentRow);
        });
    }

    private renderNewConditionRow(
        container: HTMLElement,
        conditions: Conditions,
        onUpdate: () => void
    ): void {
        if (conditions.dateConditions?.length || conditions.contentConditions?.length) return;

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
                if (!conditions.dateConditions) {
                    conditions.dateConditions = [];
                }
                conditions.dateConditions.push({
                    type: 'created',
                    operator: 'olderThan',
                    days: 1
                });
            } else {
                if (!conditions.contentConditions) {
                    conditions.contentConditions = [];
                }
                conditions.contentConditions.push({
                    operator: 'contains',
                    text: ''
                });
            }
            await this.onSave();
            onUpdate();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        cancelBtn.className = 'clickable-icon';
        cancelBtn.style.cssText = 'margin-left: auto;';
        cancelBtn.onclick = async () => {
            delete conditions.dateConditions;
            delete conditions.contentConditions;
            await this.onSave();
            onUpdate();
        };

        newConditionRow.appendChild(typeSelect);
        newConditionRow.appendChild(addBtn);
        newConditionRow.appendChild(cancelBtn);
        container.appendChild(newConditionRow);
    }

    private renderNewDateConditionInput(
        row: HTMLElement,
        conditions: Conditions,
        index: number,
        onUpdate: () => void
    ): void {
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
                delete conditions.dateConditions![index].isNew;
            } else {
                conditions.dateConditions!.splice(index, 1);
                if (!conditions.contentConditions) {
                    conditions.contentConditions = [];
                }
                conditions.contentConditions.push({
                    operator: 'contains',
                    text: ''
                });
            }
            await this.onSave();
            onUpdate();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        cancelBtn.className = 'clickable-icon';
        cancelBtn.style.cssText = 'margin-left: auto;';
        cancelBtn.onclick = async () => {
            conditions.dateConditions!.splice(index, 1);
            if (conditions.dateConditions!.length === 0) {
                delete conditions.dateConditions;
            }
            await this.onSave();
            onUpdate();
        };

        row.appendChild(typeSelect);
        row.appendChild(addBtn);
        row.appendChild(cancelBtn);
    }

    private renderExistingDateCondition(
        row: HTMLElement,
        conditions: Conditions,
        index: number,
        onUpdate: () => void
    ): void {
        const condition = conditions.dateConditions![index];

        const typeSelect = document.createElement('select');
        typeSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
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
        row.appendChild(typeSelect);

        const operatorSelect = document.createElement('select');
        operatorSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
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
        row.appendChild(operatorSelect);

        const daysInput = document.createElement('input');
        daysInput.type = 'number';
        daysInput.placeholder = 'Days';
        daysInput.min = '1';
        daysInput.value = condition.days.toString();
        daysInput.style.cssText = RULE_STYLES.SELECT_STYLES;
        daysInput.onchange = async () => {
            condition.days = parseInt(daysInput.value);
            await this.onSave();
        };
        row.appendChild(daysInput);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        deleteBtn.className = 'clickable-icon';
        deleteBtn.onclick = async () => {
            conditions.dateConditions!.splice(index, 1);
            if (conditions.dateConditions!.length === 0) {
                delete conditions.dateConditions;
            }
            await this.onSave();
            onUpdate();
        };
        row.appendChild(deleteBtn);
    }

    private renderExistingContentCondition(
        row: HTMLElement,
        conditions: Conditions,
        index: number,
        onUpdate: () => void
    ): void {
        const condition = conditions.contentConditions![index];

        const operatorSelect = document.createElement('select');
        operatorSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
        ['contains', 'notContains'].forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op === 'contains' ? 'Contains' : 'Does Not Contain';
            option.selected = op === condition.operator;
            operatorSelect.appendChild(option);
        });
        operatorSelect.onchange = async () => {
            condition.operator = operatorSelect.value as 'contains' | 'notContains';
            await this.onSave();
        };
        row.appendChild(operatorSelect);

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.placeholder = 'Text to search for';
        textInput.value = condition.text;
        textInput.style.cssText = RULE_STYLES.SELECT_STYLES;
        textInput.onchange = async () => {
            condition.text = textInput.value;
            await this.onSave();
        };
        row.appendChild(textInput);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        deleteBtn.className = 'clickable-icon';
        deleteBtn.onclick = async () => {
            conditions.contentConditions!.splice(index, 1);
            if (conditions.contentConditions!.length === 0) {
                delete conditions.contentConditions;
            }
            await this.onSave();
            onUpdate();
        };
        row.appendChild(deleteBtn);
    }
} 