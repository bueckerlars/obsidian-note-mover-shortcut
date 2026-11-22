/** Muted text at the end of a menu row, such as a shortcut or an example value. */
export function addMenuHint(item: unknown, text: string): void {
  // shortcut: MenuItem.dom is not in the public typings; the hint is skipped if it is missing.
  const dom = (item as { dom?: HTMLElement }).dom;
  dom?.createSpan({ cls: 'advancedNoteMover-menu-hint', text });
}
