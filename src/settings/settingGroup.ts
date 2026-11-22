import {
  ButtonComponent,
  requireApiVersion,
  SearchComponent,
  Setting,
  SettingGroup,
  setIcon,
} from 'obsidian';

interface SettingsGroupOptions {
  heading?: string;
  /** Muted line under the heading. */
  description?: string;
}

export interface SettingsGroup {
  /** Container for rows, native or plain. */
  listEl: HTMLElement;
  addSetting(cb: (setting: Setting) => void): void;
  /** Search field in the heading row. */
  addSearch(cb: (search: SearchComponent) => void): void;
  /** Labelled button in the heading row. */
  addButton(cb: (button: ButtonComponent) => void): void;
}

/** SettingGroup exists from Obsidian 1.11. */
export function isNativeSettingGroupAvailable(ctor: unknown): boolean {
  return (
    typeof ctor === 'function' &&
    typeof (ctor as { prototype?: { addSearch?: unknown } }).prototype
      ?.addSearch === 'function'
  );
}

export function createSettingGroup(
  containerEl: HTMLElement,
  options: SettingsGroupOptions = {}
): SettingsGroup {
  if (
    requireApiVersion('1.11.0') &&
    isNativeSettingGroupAvailable(SettingGroup)
  ) {
    const group = new SettingGroup(containerEl);
    if (options.heading) {
      group.setHeading(options.heading);
    }
    addDescription(group.listEl, options.description);
    return {
      listEl: group.listEl,
      addSetting: cb => void group.addSetting(cb),
      // The native addSearch puts the field in the list; it belongs in the heading row.
      addSearch: cb => {
        const control = headingControl(group.listEl);
        if (control) {
          cb(new SearchComponent(control));
        }
      },
      addButton: cb => {
        const control = headingControl(group.listEl);
        if (control) {
          cb(new ButtonComponent(control));
        }
      },
    };
  }
  return createFallback(containerEl, options);
}

function headingControl(listEl: HTMLElement): HTMLElement | null {
  const control = listEl.parentElement?.querySelector(
    '.setting-item-heading .setting-item-control'
  );
  return control?.instanceOf(HTMLElement) ? control : null;
}

function addDescription(
  before: HTMLElement,
  description: string | undefined
): void {
  if (!description) {
    return;
  }
  const desc = createDiv({
    cls: 'advancedNoteMover-group-desc',
    text: description,
  });
  before.parentElement?.insertBefore(desc, before);
}

function createFallback(
  containerEl: HTMLElement,
  options: SettingsGroupOptions
): SettingsGroup {
  const wrap = containerEl.createDiv({
    cls: 'advancedNoteMover-group-plain',
  });
  const heading = options.heading
    ? new Setting(wrap).setName(options.heading).setHeading()
    : null;
  const listEl = wrap.createDiv();
  addDescription(listEl, options.description);
  return {
    listEl,
    addSetting: cb => cb(new Setting(listEl)),
    addSearch: cb => heading?.addSearch(cb),
    addButton: cb => heading?.addButton(cb),
  };
}

/** Puts a plus icon in front of a heading-row button label. */
export function addPlusIcon(button: ButtonComponent): ButtonComponent {
  const icon = createSpan({ cls: 'advancedNoteMover-button-icon' });
  setIcon(icon, 'plus');
  button.buttonEl.prepend(icon);
  return button;
}
