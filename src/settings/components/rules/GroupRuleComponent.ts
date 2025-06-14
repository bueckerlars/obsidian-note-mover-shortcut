import { App } from "obsidian";
import { GroupRule, Rule, TagRule, createNewRule } from "../../types";
import { RULE_STYLES } from "./styles";
import { TagRuleComponent } from "./TagRuleComponent";

export class GroupRuleComponent {
    constructor(
        private app: App,
        private onSave: () => Promise<void>,
        private tagRuleComponent: TagRuleComponent,
        private onMove?: (index: number, direction: number, parentId?: string) => Promise<void>,
        private onDelete?: (index: number, parentId?: string) => Promise<void>
    ) {}

    renderGroupRule(
        rule: GroupRule,
        index: number,
        container: HTMLElement,
        parentId?: string,
        indentLevel: number = 0
    ): void {
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
            rule.rules.push(createNewRule('rule'));
            await this.onSave();
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
            await this.onSave();
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
            const childRule = rule.rules[i];
            if (childRule.type === 'rule') {
                this.tagRuleComponent.renderTagRule(childRule as TagRule, i, childRuleContainer, rule.id);
            } else {
                this.renderGroupRule(childRule as GroupRule, i, childRuleContainer, rule.id, indentLevel + 1);
            }
        }
        container.appendChild(childrenContainer);
    }

    private findRuleById(id: string): any {
        // This will be implemented by the parent component
        return null;
    }

    private moveRule(index: number, direction: number, parentId?: string): void {
        // This will be implemented by the parent component
    }
} 