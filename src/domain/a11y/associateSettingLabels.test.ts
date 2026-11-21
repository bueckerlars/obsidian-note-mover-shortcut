import { describe, expect, it } from 'vitest';
import { associateSettingLabels } from './associateSettingLabels';

const nodeProto = Node.prototype as unknown as {
  instanceOf(this: Node, type: new () => unknown): boolean;
};
nodeProto.instanceOf = function instanceOf(type) {
  return this instanceof (type as new () => object);
};

function setting(
  name: string,
  control: HTMLElement,
  settingId?: string
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'setting-item';
  if (settingId) item.dataset.settingId = settingId;
  const info = document.createElement('div');
  info.className = 'setting-item-info';
  const nameEl = document.createElement('div');
  nameEl.className = 'setting-item-name';
  nameEl.textContent = name;
  info.append(nameEl);
  const controlEl = document.createElement('div');
  controlEl.className = 'setting-item-control';
  controlEl.append(control);
  item.append(info, controlEl);
  return item;
}

function accessibleName(control: Element): string {
  const labelledBy = control.getAttribute('aria-labelledby');
  if (labelledBy) {
    return labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
      .join(' ')
      .trim();
  }
  return control.getAttribute('aria-label')?.trim() ?? '';
}

describe('associateSettingLabels', () => {
  it('names a checkbox and a select from the setting name', () => {
    const root = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const select = document.createElement('select');
    root.append(
      setting('Move notes on edit', checkbox, 'triggers.onEdit'),
      setting('Keep history for', select, 'history.retention')
    );
    document.body.append(root);

    associateSettingLabels(root);

    expect(accessibleName(checkbox)).toBe('Move notes on edit');
    expect(accessibleName(select)).toBe('Keep history for');
    root.remove();
  });

  it('leaves a field that already has a name alone', () => {
    const root = document.createElement('div');
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Folder');
    root.append(setting('Destination', input));
    document.body.append(root);

    associateSettingLabels(root);

    expect(input.getAttribute('aria-label')).toBe('Folder');
    expect(input.hasAttribute('aria-labelledby')).toBe(false);
    root.remove();
  });
});
