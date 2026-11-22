import AdvancedNoteMoverPlugin from 'main';
import { Setting, setIcon } from 'obsidian';
import {
  EXCLUSION_KINDS,
  formatExclusion,
  parseExclusion,
  type ExclusionKind,
} from '../../domain/filters/exclusionFilter';
import { fill, strings } from '../../i18n/locale';
import {
  addPhoneAddRow,
  addPlusIcon,
  createSettingGroup,
} from '../settingGroup';
import { ExclusionValueSuggest } from '../suggesters/ExclusionValueSuggest';

const ICONS: Record<ExclusionKind, string> = {
  tag: 'tag',
  folder: 'folder',
  fileName: 'file',
  property: 'text',
  other: 'text',
};

type AddableKind = (typeof EXCLUSION_KINDS)[number];

/** Excluded notes: one row per stored filter string, plus an inline add row. */
export class FilterSettingsSection {
  private listEl: HTMLElement | null = null;
  private suggest: ExclusionValueSuggest | null = null;

  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  render(): void {
    const labels = strings().settings;
    const group = createSettingGroup(this.containerEl, {
      heading: labels.exclusionsHeading,
      description: labels.exclusionsDesc,
    });
    group.addButton(button => {
      button.setButtonText(labels.exclusionsAdd).onClick(() => {
        this.renderList(true);
      });
      addPlusIcon(button);
    });
    this.listEl = group.listEl;
    this.renderList(false);
  }

  private get filters(): { value: string }[] {
    return this.plugin.pluginData.settings.filters.filter;
  }

  private renderList(adding: boolean): void {
    const list = this.listEl;
    if (!list) return;
    this.closeSuggest();
    list.empty();
    list.addClass('advancedNoteMover-filters-container');
    const labels = strings().settings;
    if (this.filters.length === 0 && !adding) {
      list.createDiv({
        cls: 'advancedNoteMover-empty advancedNoteMover-empty-text',
        text: labels.exclusionsEmpty,
      });
    }
    this.filters.forEach((filter, index) => {
      const { kind, value } = parseExclusion(filter.value);
      const shown =
        kind === 'tag' && value && !value.startsWith('#') ? `#${value}` : value;
      const setting = new Setting(list).setName(shown);
      const { settingEl } = setting;
      setIcon(
        settingEl.createSpan({ cls: 'advancedNoteMover-row-icon' }),
        ICONS[kind]
      );
      settingEl.prepend(settingEl.lastElementChild as Node);
      setting.nameEl.createSpan({
        cls: 'advancedNoteMover-faint',
        text: this.kindLabel(kind),
      });
      setting.addExtraButton(btn => {
        btn
          .setIcon('x')
          .setTooltip(fill(labels.exclusionRemove, { value: shown }));
        btn.extraSettingsEl.setAttrs({
          role: 'button',
          'aria-label': fill(labels.exclusionRemove, { value: shown }),
        });
        btn.onClick(async () => {
          this.filters.splice(index, 1);
          await this.save();
        });
      });
    });
    if (adding) {
      this.renderAddRow(list);
    } else {
      addPhoneAddRow(list, labels.exclusionsAdd, () => this.renderList(true));
    }
  }

  private kindLabel(kind: ExclusionKind): string {
    const labels = strings().settings;
    return {
      tag: labels.exclusionKindTag,
      folder: labels.exclusionKindFolder,
      fileName: labels.exclusionKindFileName,
      property: labels.exclusionKindProperty,
      other: labels.exclusionKindOther,
    }[kind];
  }

  private renderAddRow(list: HTMLElement): void {
    const labels = strings().settings;
    let kind: AddableKind = 'tag';
    const placeholders: Record<AddableKind, string> = {
      tag: labels.exclusionPlaceholderTag,
      folder: labels.exclusionPlaceholderFolder,
      fileName: labels.exclusionPlaceholderFileName,
      property: labels.exclusionPlaceholderProperty,
    };
    const typeLabels: Record<AddableKind, string> = {
      tag: labels.exclusionTypeTag,
      folder: labels.exclusionTypeFolder,
      fileName: labels.exclusionTypeFileName,
      property: labels.exclusionTypeProperty,
    };
    const setting = new Setting(list);
    setting.settingEl.addClass('advancedNoteMover-exclusion-add');
    setting.infoEl.hide();
    let input = null as HTMLInputElement | null;

    const cancel = () => this.renderList(false);
    const submit = async () => {
      const stored = formatExclusion(kind, input?.value ?? '');
      if (stored === null) {
        input?.focus();
        return;
      }
      if (!this.filters.some(filter => filter.value === stored)) {
        this.filters.push({ value: stored });
      }
      await this.save();
    };

    setting.addDropdown(dropdown => {
      for (const option of EXCLUSION_KINDS) {
        dropdown.addOption(option, typeLabels[option]);
      }
      dropdown.selectEl.setAttr('aria-label', labels.exclusionTypeLabel);
      dropdown.setValue(kind).onChange(value => {
        kind = value as AddableKind;
        input?.setAttr('placeholder', placeholders[kind]);
        this.suggest?.reset();
        input?.focus();
      });
    });
    setting.addText(text => {
      input = text.inputEl;
      text.setPlaceholder(placeholders[kind]);
      input.setAttr('aria-label', labels.exclusionValueLabel);
      this.suggest = new ExclusionValueSuggest(
        this.plugin.app,
        input,
        () => kind
      );
    });
    setting.addButton(button =>
      button
        .setButtonText(labels.exclusionAddConfirm)
        .setCta()
        .onClick(() => void submit())
    );
    setting.addExtraButton(button => {
      button.setIcon('x').onClick(cancel);
      button.extraSettingsEl.setAttrs({
        role: 'button',
        'aria-label': strings().common.cancel,
      });
    });
    setting.settingEl.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        cancel();
      } else if (event.key === 'Enter' && event.target === input) {
        event.preventDefault();
        void submit();
      }
    });
    input?.focus();
  }

  private async save(): Promise<void> {
    await this.plugin.save_settings();
    this.plugin.advancedNoteMover.updateRuleManager();
    this.refreshDisplay();
  }

  private closeSuggest(): void {
    this.suggest?.close();
    this.suggest = null;
  }

  /** Called by the tab before it re-renders or hides. */
  public cleanup(): void {
    this.closeSuggest();
  }
}
