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
            await this.onSave();
        };
        new TagSuggest(this.app, tagInput);
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
            await this.onSave();
        };
        new FolderSuggest(this.app, pathInput);
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

        container.appendChild(btnContainer);
    }

    private findRuleById(id: string): any {
        // This will be implemented by the parent component
        return null;
    }

    private moveRule(index: number, direction: number, parentId?: string): void {
        // This will be implemented by the parent component
    }
} 