import { Menu } from 'obsidian';
import { strings } from '../../../i18n/locale';
import type { CriteriaType } from '../../../types/RuleV2';
import { CRITERIA_GROUPS, criteriaLabel } from '../ruleEditorShared';

/** Grouped menu of condition types below `anchor`. */
export function openConditionTypeMenu(
  anchor: HTMLElement,
  onSelect: (type: CriteriaType) => void
): void {
  const menu = new Menu();
  CRITERIA_GROUPS.forEach(({ group, types }, index) => {
    if (index > 0) menu.addSeparator();
    menu.addItem(item =>
      item.setTitle(strings().ruleEditorTypeGroups[group]).setIsLabel(true)
    );
    for (const [type, icon] of types) {
      menu.addItem(item =>
        item
          .setTitle(criteriaLabel(type))
          .setIcon(icon)
          .onClick(() => onSelect(type))
      );
    }
  });
  menu.onHide(() => {
    if (anchor.isConnected) anchor.focus();
  });
  const rect = anchor.getBoundingClientRect();
  menu.showAtPosition({ x: rect.left, y: rect.bottom + 4, width: rect.width });
}
