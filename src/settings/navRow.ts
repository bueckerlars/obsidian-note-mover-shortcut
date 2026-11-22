import { setIcon, type Setting } from 'obsidian';
import type { SettingsGroup } from './settingGroup';

interface NavRowOptions {
  name: string;
  desc?: string;
  /** Plain value shown before the chevron. */
  value?: string;
  /** Warning pill shown before the chevron. */
  pill?: string;
  onOpen: () => void;
}

/** A row that opens a sub-page: value or pill, then a chevron. */
export function addNavRow(group: SettingsGroup, options: NavRowOptions): void {
  group.addSetting(setting => {
    setting.setName(options.name);
    if (options.desc) {
      setting.setDesc(options.desc);
    }
    decorateNavRow(setting, options);
  });
}

function decorateNavRow(setting: Setting, options: NavRowOptions): void {
  const { settingEl, controlEl } = setting;
  settingEl.addClass('advancedNoteMover-nav-row');
  settingEl.setAttr('role', 'button');
  settingEl.setAttr('tabindex', '0');
  if (options.pill) {
    controlEl.createSpan({
      cls: 'advancedNoteMover-pill mod-warning',
      text: options.pill,
    });
  }
  if (options.value) {
    controlEl.createSpan({
      cls: 'advancedNoteMover-nav-value',
      text: options.value,
    });
  }
  setIcon(
    controlEl.createSpan({ cls: 'advancedNoteMover-nav-chevron' }),
    'chevron-right'
  );
  settingEl.addEventListener('click', options.onOpen);
  settingEl.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      options.onOpen();
    }
  });
}
