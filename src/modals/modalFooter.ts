import { ButtonComponent } from 'obsidian';

export interface ModalFooterOptions {
  primaryText: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  /** Destructive primary action, drawn with the warning style. */
  warning?: boolean;
  cancelText: string;
  onCancel: () => void;
}

export interface ModalFooter {
  /** Left side: a secondary action or a status text. */
  leftEl: HTMLElement;
  primary: ButtonComponent;
  cancel: ButtonComponent;
}

/** Footer row: optional left content, then the primary button before Cancel. */
export function renderModalFooter(
  parent: HTMLElement,
  options: ModalFooterOptions
): ModalFooter {
  const footer = parent.createDiv({ cls: 'advancedNoteMover-footer-row' });
  const leftEl = footer.createDiv({ cls: 'advancedNoteMover-footer-left' });
  const primary = new ButtonComponent(footer)
    .setButtonText(options.primaryText)
    .onClick(options.onPrimary);
  primary.setDisabled(options.primaryDisabled ?? false);
  if (options.warning) {
    primary.buttonEl.addClass('mod-warning');
  } else {
    primary.setCta();
  }
  const cancel = new ButtonComponent(footer)
    .setButtonText(options.cancelText)
    .onClick(options.onCancel);
  return { leftEl, primary, cancel };
}
