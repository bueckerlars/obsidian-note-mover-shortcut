import { setIcon } from 'obsidian';

/** Button that looks like a dropdown and opens a menu. */
export function createSelectButton(
  parent: HTMLElement,
  options: { label: string; icon: string | null; ariaLabel: string }
): HTMLButtonElement {
  const button = parent.createEl('button', {
    cls: 'advancedNoteMover-select-button',
    attr: {
      type: 'button',
      'aria-label': options.ariaLabel,
      'aria-haspopup': 'menu',
    },
  });
  const text = button.createSpan({ cls: 'advancedNoteMover-select-label' });
  if (options.icon) {
    setIcon(
      text.createSpan({ cls: 'advancedNoteMover-select-icon' }),
      options.icon
    );
  }
  text.createSpan({ text: options.label });
  setIcon(
    button.createSpan({ cls: 'advancedNoteMover-select-chevron' }),
    'chevrons-up-down'
  );
  return button;
}
