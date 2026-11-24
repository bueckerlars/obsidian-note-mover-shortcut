import { Menu } from 'obsidian';
import { strings } from '../../../i18n/locale';
import type { PlaceholderOption } from '../../../domain/templates/placeholderCatalog';
import { addMenuHint } from '../../../utils/menuHint';

export interface PlaceholderMenuOptions {
  created: PlaceholderOption[];
  properties: PlaceholderOption[];
  onPick: (token: string) => void;
  onHelp: () => void;
  onClose?: () => void;
}

/** Native menu of placeholders with their example values on the right. */
export function openPlaceholderMenu(
  position: { x: number; y: number },
  options: PlaceholderMenuOptions
): void {
  const text = strings().modals;
  const menu = new Menu();
  const addGroup = (label: string, items: PlaceholderOption[]) => {
    if (items.length === 0) return;
    menu.addItem(item => item.setTitle(label).setIsLabel(true));
    for (const { token, example } of items) {
      menu.addItem(item => {
        item.setTitle(token).onClick(() => options.onPick(token));
        addMenuHint(item, example);
      });
    }
    menu.addSeparator();
  };
  addGroup(text.ruleEditorPlaceholderCreated, options.created);
  addGroup(text.ruleEditorPlaceholderProperties, options.properties);
  menu.addItem(item =>
    item
      .setTitle(text.ruleEditorPlaceholderHelp)
      .setIcon('help-circle')
      .onClick(options.onHelp)
  );
  if (options.onClose) menu.onHide(options.onClose);
  menu.showAtPosition(position);
}
