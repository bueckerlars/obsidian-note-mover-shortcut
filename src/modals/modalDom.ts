import { setIcon } from 'obsidian';

export function setAttrs(el: HTMLElement, attrs: Record<string, string>): void {
  for (const [name, value] of Object.entries(attrs))
    el.setAttribute(name, value);
}

/** Decorative Lucide icon, hidden from screen readers. */
export function iconSpan(
  parent: HTMLElement,
  icon: string,
  cls?: string
): HTMLElement {
  const el = parent.createSpan({ cls });
  el.ariaHidden = 'true';
  setIcon(el, icon);
  return el;
}
