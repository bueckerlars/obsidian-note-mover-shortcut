let unnamedField = 0;

function isHtmlElement(node: unknown): node is HTMLElement {
  if (typeof node !== 'object' || node === null || !('instanceOf' in node)) {
    return false;
  }
  const candidate = node as {
    instanceOf?: (type: typeof HTMLElement) => boolean;
  };
  return (
    typeof candidate.instanceOf === 'function' &&
    candidate.instanceOf(HTMLElement)
  );
}

/**
 * Point each field at the setting name Obsidian already shows.
 * The name is a sibling, so the field has no accessible name until this runs.
 */
export function associateSettingLabels(root: ParentNode): void {
  for (const item of Array.from(root.querySelectorAll('.setting-item'))) {
    if (!isHtmlElement(item)) continue;
    const name = item.querySelector('.setting-item-name');
    if (!isHtmlElement(name)) continue;
    const text = name.textContent?.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (!name.id) {
      const settingId =
        item.getAttribute('data-setting-id') || `field-${unnamedField++}`;
      name.id = `anm-setting-${settingId}`;
    }
    for (const control of Array.from(
      item.querySelectorAll('input, select, textarea')
    )) {
      if (!isHtmlElement(control)) continue;
      if (control.getAttribute('aria-label')?.trim()) continue;
      if (control.getAttribute('aria-labelledby')?.trim()) continue;
      control.setAttribute('aria-labelledby', name.id);
    }
  }
}
