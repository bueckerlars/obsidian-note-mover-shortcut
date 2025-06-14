import { App, Setting } from "obsidian";
import { GroupRule, Trigger, createNewTrigger } from "../../types";
import { RULE_STYLES } from "./styles";
import { TagRuleComponent } from "./TagRuleComponent";
import { FolderSuggest } from "../../suggesters/FolderSuggest";
import { TagSuggest } from "../../suggesters/TagSuggest";
import { ConditionsComponent } from "./ConditionsComponent";
import { v4 as uuidv4 } from 'uuid';
import { TriggerUIStateManager } from "./TriggerUIState";

export class GroupRuleComponent {
    private conditionsComponent: ConditionsComponent;
    private triggerUIState: TriggerUIStateManager;

    constructor(
        private app: App,
        private onSave: () => Promise<void>,
        private tagRuleComponent: TagRuleComponent,
        private onMove?: (index: number, direction: number, parentId?: string) => Promise<void>,
        private onDelete?: (index: number, parentId?: string) => Promise<void>,
        private onUpdate?: () => void
    ) {
        this.conditionsComponent = new ConditionsComponent(app, onSave);
        this.triggerUIState = new TriggerUIStateManager();
    }

    renderGroupRule(
        rule: GroupRule,
        index: number,
        container: HTMLElement,
        parentId?: string,
        indentLevel: number = 0
    ): void {
        const indent = indentLevel * 12;
        container.style.background = 'var(--background-secondary)';
        container.style.border = '1px solid var(--background-modifier-border)';
        container.style.borderRadius = '8px';
        container.style.padding = '12px 8px 8px 8px';
        container.style.marginBottom = '12px';
        container.style.marginLeft = `${indent}px`;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.boxSizing = 'border-box';
        container.style.width = `calc(100% - ${indent}px)`;
        container.style.maxWidth = '100%';
        container.style.overflow = 'hidden';

        // Header row (Type + Move/Delete)
        const headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '4px';
        headerRow.style.width = '100%';

        const groupLabel = document.createElement('span');
        groupLabel.textContent = 'GROUP';
        groupLabel.style.fontWeight = 'bold';
        groupLabel.style.marginRight = '16px';
        headerRow.appendChild(groupLabel);

        // Group type dropdown
        const typeSelect = document.createElement('select');
        typeSelect.style.marginRight = '16px';
        typeSelect.title = '';
        // AND option
        const andOption = document.createElement('option');
        andOption.value = 'and';
        andOption.textContent = 'AND';
        andOption.title = 'All triggers must match for the group to apply.';
        typeSelect.appendChild(andOption);
        // OR option
        const orOption = document.createElement('option');
        orOption.value = 'or';
        orOption.textContent = 'OR';
        orOption.title = 'At least one trigger must match for the group to apply.';
        typeSelect.appendChild(orOption);
        typeSelect.value = rule.groupType || 'and';
        typeSelect.onchange = async (e) => {
            rule.groupType = (e.target as HTMLSelectElement).value as 'and' | 'or';
            await this.onSave();
        };
        // Show tooltip on hover
        typeSelect.onmouseover = (e) => {
            const val = (e.target as HTMLSelectElement).value;
            if (val === 'and') {
                typeSelect.title = 'All triggers must match for the group to apply.';
            } else {
                typeSelect.title = 'At least one trigger must match for the group to apply.';
            }
        };
        typeSelect.onfocus = typeSelect.onmouseover;
        headerRow.appendChild(typeSelect);

        // Spacer to keep action buttons aligned to the right
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
        upBtn.onclick = async () => {
            if (this.onMove) {
                await this.onMove(index, -1, parentId);
            }
        };
        headerRow.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 12l-4-6h8z" fill="currentColor"/></svg>';
        downBtn.title = 'Move group down';
        downBtn.className = 'clickable-icon';
        downBtn.style.marginRight = '2px';
        downBtn.style.minWidth = '32px';
        downBtn.onclick = async () => {
            if (this.onMove) {
                await this.onMove(index, 1, parentId);
            }
        };
        headerRow.appendChild(downBtn);

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        delBtn.title = 'Delete group';
        delBtn.className = 'clickable-icon';
        delBtn.style.minWidth = '32px';
        delBtn.onclick = async () => {
            if (this.onDelete) {
                await this.onDelete(index, parentId);
            }
        };
        headerRow.appendChild(delBtn);

        container.appendChild(headerRow);

        // Separator between header and content
        const separator = document.createElement('div');
        separator.style.width = '100%';
        separator.style.height = '1px';
        separator.style.background = 'var(--background-modifier-border)';
        separator.style.margin = '8px 0 12px 0';
        container.appendChild(separator);

        // Destination Setting (only for main group, i.e., without parentId)
        if (!parentId) {
            const destinationSetting = document.createElement('div');
            destinationSetting.style.display = 'flex';
            destinationSetting.style.alignItems = 'center';
            destinationSetting.style.marginBottom = '8px';
            destinationSetting.style.gap = '8px';

            const label = document.createElement('span');
            label.textContent = 'Destination';
            label.style.marginRight = '8px';
            destinationSetting.appendChild(label);

            const folderInput = document.createElement('input');
            folderInput.type = 'text';
            folderInput.placeholder = 'Enter destination folder';
            folderInput.value = rule.destination;
            folderInput.style.flex = '1';
            folderInput.onchange = async (e) => {
                rule.destination = (e.target as HTMLInputElement).value;
                await this.onSave();
            };
            destinationSetting.appendChild(folderInput);
            new FolderSuggest(this.app, folderInput);

            container.appendChild(destinationSetting);
        }
        
        // Trigger List
        const triggersContainer = document.createElement('div');
        triggersContainer.style.width = '100%';
        triggersContainer.style.display = 'flex';
        triggersContainer.style.flexDirection = 'column';
        triggersContainer.style.gap = '4px';
        triggersContainer.style.marginTop = '8px';

        if (rule.triggers.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.style.padding = '8px';
            placeholder.style.textAlign = 'center';
            placeholder.style.color = 'var(--text-muted)';
            placeholder.style.fontStyle = 'italic';
            placeholder.style.border = '1px dashed var(--background-modifier-border)';
            placeholder.style.borderRadius = '4px';
            placeholder.style.margin = '4px 0';
            placeholder.textContent = 'No triggers present. Click "Add Trigger" to add some.';
            triggersContainer.appendChild(placeholder);
        } else {
            for (let i = 0; i < rule.triggers.length; i++) {
                const triggerContainer = document.createElement('div');
                this.renderTrigger(rule.triggers[i], i, triggerContainer, rule);
                triggersContainer.appendChild(triggerContainer);
            }
        }
        container.appendChild(triggersContainer);

        // Subgroups (now directly after triggers, before buttons)
        if (rule.subgroups && rule.subgroups.length > 0) {
            const subgroupsContainer = document.createElement('div');
            subgroupsContainer.style.width = '100%';
            subgroupsContainer.style.display = 'flex';
            subgroupsContainer.style.flexDirection = 'column';
            subgroupsContainer.style.gap = '4px';
            subgroupsContainer.style.marginTop = '8px';
            subgroupsContainer.style.marginLeft = '12px'; // Indentation for subgroups
            subgroupsContainer.style.marginRight = '8px'; // Spacing from parent group's right edge
            subgroupsContainer.style.paddingRight = '8px'; // Additional right padding

            for (let i = 0; i < rule.subgroups.length; i++) {
                const subgroupContainer = document.createElement('div');
                this.renderGroupRule(rule.subgroups[i], i, subgroupContainer, rule.id, indentLevel + 1);
                subgroupsContainer.appendChild(subgroupContainer);
            }

            container.appendChild(subgroupsContainer);
        }

        // Button container for Add Trigger/Subgroup (now always at the bottom)
        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.justifyContent = 'flex-end';
        buttonRow.style.gap = '8px';
        buttonRow.style.marginTop = '8px';
        buttonRow.style.width = '100%';

        // Add Trigger Button
        const addTriggerBtn = document.createElement('button');
        addTriggerBtn.textContent = 'Add Trigger';
        addTriggerBtn.className = 'mod-cta';
        addTriggerBtn.onclick = async () => {
            rule.triggers.push(createNewTrigger());
            await this.onSave();
            if (this.onUpdate) {
                this.onUpdate();
            }
        };
        buttonRow.appendChild(addTriggerBtn);

        // Add Subgroup Button
        const addSubgroupBtn = document.createElement('button');
        addSubgroupBtn.textContent = 'Add Subgroup';
        addSubgroupBtn.className = 'mod-cta';
        addSubgroupBtn.onclick = async () => {
            if (!rule.subgroups) {
                rule.subgroups = [];
            }
            rule.subgroups.push({
                id: uuidv4(),
                type: 'group',
                groupType: 'and',
                destination: '',
                triggers: [],
                subgroups: []
            });
            await this.onSave();
            if (this.onUpdate) {
                this.onUpdate();
            }
        };
        buttonRow.appendChild(addSubgroupBtn);

        container.appendChild(buttonRow);
    }

    private renderTrigger(
        trigger: Trigger,
        index: number,
        container: HTMLElement,
        parentRule: GroupRule
    ): void {
        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
        container.style.padding = '8px';
        container.style.background = 'var(--background-primary)';
        container.style.borderRadius = '4px';
        container.style.flexDirection = 'column';

        // Row for tag and buttons
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.width = '100%';

        // Tag Input
        const tagInput = document.createElement('input');
        tagInput.type = 'text';
        tagInput.placeholder = 'Enter tag';
        tagInput.value = trigger.tag;
        tagInput.style.flex = '1';
        tagInput.onchange = async (e) => {
            trigger.tag = (e.target as HTMLInputElement).value;
            await this.onSave();
        };
        row.appendChild(tagInput);
        new TagSuggest(this.app, tagInput);

        // Check condition types
        const hasDate = !!(trigger.conditions && trigger.conditions.dateCondition);
        const hasContent = !!(trigger.conditions && trigger.conditions.contentCondition);
        const allTypes = [
            { value: 'date', label: 'Date Condition', has: hasDate },
            { value: 'content', label: 'Content Condition', has: hasContent }
        ];
        const availableTypes = allTypes.filter(t => !t.has);

        const uiState = this.triggerUIState.getState(trigger.id);

        // Add condition button
        const addConditionBtn = document.createElement('button');
        addConditionBtn.textContent = 'Add Condition';
        addConditionBtn.className = 'mod-cta';
        addConditionBtn.onclick = () => {
            this.triggerUIState.setState(trigger.id, { showAddConditionRow: true });
            this.renderTrigger(trigger, index, container, parentRule);
        };
        row.appendChild(addConditionBtn);

        // Delete trigger button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
        deleteBtn.title = 'Delete trigger';
        deleteBtn.className = 'clickable-icon';
        deleteBtn.onclick = async () => {
            parentRule.triggers.splice(index, 1);
            await this.onSave();
            if (this.onUpdate) this.onUpdate();
        };
        row.appendChild(deleteBtn);

        container.appendChild(row);

        // Render existing conditions
        if (trigger.conditions) {
            if (trigger.conditions.dateCondition) {
                const dateRow = document.createElement('div');
                dateRow.style.display = 'flex';
                dateRow.style.alignItems = 'center';
                dateRow.style.gap = '8px';
                dateRow.style.padding = '8px 22px 8px 36px';
                dateRow.style.background = 'var(--background-secondary)';
                dateRow.style.borderRadius = '4px';
                dateRow.style.marginTop = '4px';
                dateRow.style.width = '100%';
                dateRow.style.boxSizing = 'border-box';

                const typeSelect = document.createElement('select');
                typeSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
                ['created', 'modified'].forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = type === 'created' ? 'Created Date' : 'Modified Date';
                    option.selected = type === trigger.conditions!.dateCondition!.type;
                    typeSelect.appendChild(option);
                });
                typeSelect.onchange = async () => {
                    trigger.conditions!.dateCondition!.type = typeSelect.value as 'created' | 'modified';
                    await this.onSave();
                };
                dateRow.appendChild(typeSelect);

                const operatorSelect = document.createElement('select');
                operatorSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
                ['olderThan', 'newerThan'].forEach(op => {
                    const option = document.createElement('option');
                    option.value = op;
                    option.textContent = op === 'olderThan' ? 'Older Than' : 'Newer Than';
                    option.selected = op === trigger.conditions!.dateCondition!.operator;
                    operatorSelect.appendChild(option);
                });
                operatorSelect.onchange = async () => {
                    trigger.conditions!.dateCondition!.operator = operatorSelect.value as 'olderThan' | 'newerThan';
                    await this.onSave();
                };
                dateRow.appendChild(operatorSelect);

                const daysInput = document.createElement('input');
                daysInput.type = 'number';
                daysInput.placeholder = 'Days';
                daysInput.min = '1';
                daysInput.value = trigger.conditions!.dateCondition!.days.toString();
                daysInput.style.cssText = RULE_STYLES.SELECT_STYLES;
                daysInput.onchange = async () => {
                    const value = parseInt(daysInput.value);
                    if (isNaN(value) || value < 1) {
                        daysInput.value = trigger.conditions!.dateCondition!.days.toString();
                        return;
                    }
                    trigger.conditions!.dateCondition!.days = value;
                    await this.onSave();
                };
                dateRow.appendChild(daysInput);

                // Spacer for delete button
                const spacer = document.createElement('div');
                spacer.style.flex = '1 1 auto';
                dateRow.appendChild(spacer);

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
                deleteBtn.title = 'Delete condition';
                deleteBtn.className = 'clickable-icon';
                deleteBtn.onclick = async () => {
                    delete trigger.conditions!.dateCondition;
                    if (!trigger.conditions!.contentCondition) {
                        delete trigger.conditions;
                    }
                    await this.onSave();
                    this.renderTrigger(trigger, index, container, parentRule);
                };
                dateRow.appendChild(deleteBtn);

                container.appendChild(dateRow);
            }

            if (trigger.conditions.contentCondition) {
                const contentRow = document.createElement('div');
                contentRow.style.display = 'flex';
                contentRow.style.alignItems = 'center';
                contentRow.style.gap = '8px';
                contentRow.style.padding = '8px 22px 8px 36px';
                contentRow.style.background = 'var(--background-secondary)';
                contentRow.style.borderRadius = '4px';
                contentRow.style.marginTop = '4px';
                contentRow.style.width = '100%';
                contentRow.style.boxSizing = 'border-box';

                const operatorSelect = document.createElement('select');
                operatorSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
                ['contains', 'notContains'].forEach(op => {
                    const option = document.createElement('option');
                    option.value = op;
                    option.textContent = op === 'contains' ? 'Contains' : 'Does Not Contain';
                    option.selected = op === trigger.conditions!.contentCondition!.operator;
                    operatorSelect.appendChild(option);
                });
                operatorSelect.onchange = async () => {
                    trigger.conditions!.contentCondition!.operator = operatorSelect.value as 'contains' | 'notContains';
                    await this.onSave();
                };
                contentRow.appendChild(operatorSelect);

                const textInput = document.createElement('input');
                textInput.type = 'text';
                textInput.placeholder = 'Text to search for';
                textInput.value = trigger.conditions!.contentCondition!.text;
                textInput.style.cssText = RULE_STYLES.SELECT_STYLES;
                textInput.onchange = async () => {
                    trigger.conditions!.contentCondition!.text = textInput.value;
                    await this.onSave();
                };
                contentRow.appendChild(textInput);

                // Spacer for delete button
                const spacer = document.createElement('div');
                spacer.style.flex = '1 1 auto';
                contentRow.appendChild(spacer);

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
                deleteBtn.title = 'Delete condition';
                deleteBtn.className = 'clickable-icon';
                deleteBtn.onclick = async () => {
                    delete trigger.conditions!.contentCondition;
                    if (!trigger.conditions!.dateCondition) {
                        delete trigger.conditions;
                    }
                    await this.onSave();
                    this.renderTrigger(trigger, index, container, parentRule);
                };
                contentRow.appendChild(deleteBtn);

                container.appendChild(contentRow);
            }
        }

        // Add condition row (only show if showAddConditionRow is true)
        if (uiState?.showAddConditionRow) {
            const addRow = document.createElement('div');
            addRow.style.display = 'flex';
            addRow.style.alignItems = 'center';
            addRow.style.gap = '8px';
            addRow.style.padding = '8px 22px 8px 36px';
            addRow.style.background = 'var(--background-secondary)';
            addRow.style.borderRadius = '4px';
            addRow.style.marginTop = '4px';
            addRow.style.width = '100%';
            addRow.style.boxSizing = 'border-box';

            const typeSelect = document.createElement('select');
            typeSelect.style.cssText = RULE_STYLES.SELECT_STYLES;
            availableTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value;
                option.textContent = type.label;
                typeSelect.appendChild(option);
            });

            addRow.appendChild(typeSelect);

            // Spacer für die Buttons
            const spacer = document.createElement('div');
            spacer.style.flex = '1 1 auto';
            addRow.appendChild(spacer);

            const addBtn = document.createElement('button');
            addBtn.textContent = 'Add';
            addBtn.className = 'mod-cta';
            addBtn.onclick = async () => {
                if (!trigger.conditions) trigger.conditions = {};
                if (typeSelect.value === 'date') {
                    trigger.conditions.dateCondition = {
                        type: 'created',
                        operator: 'olderThan',
                        days: 1
                    };
                } else if (typeSelect.value === 'content') {
                    trigger.conditions.contentCondition = {
                        operator: 'contains',
                        text: ''
                    };
                }
                this.triggerUIState.clearState(trigger.id);
                await this.onSave();
                this.renderTrigger(trigger, index, container, parentRule);
                if (this.onUpdate) this.onUpdate();
            };
            addRow.appendChild(addBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>';
            cancelBtn.className = 'clickable-icon';
            cancelBtn.onclick = () => {
                this.triggerUIState.clearState(trigger.id);
                this.renderTrigger(trigger, index, container, parentRule);
            };
            addRow.appendChild(cancelBtn);

            container.appendChild(addRow);
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