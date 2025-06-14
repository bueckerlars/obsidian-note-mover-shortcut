import { App } from "obsidian";
import { GroupRule, Rule, createNewRule } from "../../types";
import { RULE_STYLES } from "./styles";
import { TagRuleComponent } from "./TagRuleComponent";

export class GroupRuleComponent {
    constructor(
        private app: App,
        private onSave: () => Promise<void>,
        private tagRuleComponent: TagRuleComponent
    ) {}

    renderGroupRule(
        rule: GroupRule,
        index: number,
        container: HTMLElement,
        parentId?: string,
        indentLevel: number = 0
    ): void {
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            background: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: ${RULE_STYLES.GROUP_PADDING}px;
            margin-bottom: ${RULE_STYLES.RULE_SPACING}px;
            width: 100%;
            box-sizing: border-box;
        `;

        // Header Row
        const headerRow = document.createElement('div');
        headerRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: ${RULE_STYLES.RULE_SPACING}px;
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
            await this.onSave();
            this.renderGroupRule(rule, index, container, parentId, indentLevel);
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
            this.renderGroupRule(rule, index, container, parentId, indentLevel);
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
                const parentRule = this.findRuleById(parentId);
                if (parentRule && 'rules' in parentRule) {
                    parentRule.rules.splice(index, 1);
                }
            } else {
                // This will be handled by the parent component
            }
            await this.onSave();
        };
        headerRow.appendChild(delBtn);

        container.appendChild(headerRow);

        // Separator
        const separator = document.createElement('div');
        separator.style.cssText = `
            width: 100%;
            height: 1px;
            background: var(--background-modifier-border);
            margin-bottom: ${RULE_STYLES.RULE_SPACING}px;
        `;
        container.appendChild(separator);

        // Children Container
        const childrenContainer = document.createElement('div');
        childrenContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: ${RULE_STYLES.RULE_SPACING}px;
            width: 100%;
        `;

        for (let i = 0; i < rule.rules.length; i++) {
            const childRuleContainer = document.createElement('div');
            childrenContainer.appendChild(childRuleContainer);
            this.renderRule(rule.rules[i], i, rule.id, indentLevel + 1, childRuleContainer);
        }
        container.appendChild(childrenContainer);
    }

    private renderRule(
        rule: Rule,
        index: number,
        parentId: string,
        indentLevel: number,
        container: HTMLElement
    ): void {
        if (rule.type === 'rule') {
            this.tagRuleComponent.renderTagRule(rule, index, container, parentId);
        } else {
            this.renderGroupRule(rule, index, container, parentId, indentLevel);
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