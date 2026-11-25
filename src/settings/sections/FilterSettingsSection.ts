import AdvancedNoteMoverPlugin from 'main';
import { Setting, setIcon } from 'obsidian';
import {
  EXCLUSION_KINDS,
  formatExclusion,
  parseExclusion,
  replaceExclusion,
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
/** A stored filter of an unknown type can be edited as plain text. */
type EditableKind = AddableKind | 'other';

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

  private renderList(adding: boolean, editing: number | null = null): void {
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
      if (index === editing) {
        this.renderEditRow(list, index);
        return;
      }
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
          .setIcon('pencil')
          .setTooltip(fill(labels.exclusionEdit, { value: shown }));
        btn.extraSettingsEl.setAttrs({
          role: 'button',
          'aria-label': fill(labels.exclusionEdit, { value: shown }),
        });
        btn.onClick(() => this.renderList(false, index));
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
    this.renderExclusionForm(list, null);
  }

  private renderEditRow(list: HTMLElement, index: number): void {
    this.renderExclusionForm(list, index);
  }

  /** The row to add a filter, or to change the type and value of filter `editIndex`. */
  private renderExclusionForm(
    list: HTMLElement,
    editIndex: number | null
  ): void {
    const labels = strings().settings;
    const current =
      editIndex === null ? null : parseExclusion(this.filters[editIndex].value);
    let kind: EditableKind = current?.kind ?? 'tag';
    const placeholders: Record<EditableKind, string> = {
      tag: labels.exclusionPlaceholderTag,
      folder: labels.exclusionPlaceholderFolder,
      fileName: labels.exclusionPlaceholderFileName,
      property: labels.exclusionPlaceholderProperty,
      other: '',
    };
    const typeLabels: Record<EditableKind, string> = {
      tag: labels.exclusionTypeTag,
      folder: labels.exclusionTypeFolder,
      fileName: labels.exclusionTypeFileName,
      property: labels.exclusionTypeProperty,
      other: labels.exclusionKindOther,
    };
    const setting = new Setting(list);
    setting.settingEl.addClass('advancedNoteMover-exclusion-add');
    setting.infoEl.hide();
    let input = null as HTMLInputElement | null;

    const cancel = () => this.renderList(false);
    const submit = async () => {
      const stored =
        kind === 'other'
          ? input?.value.trim() || null
          : formatExclusion(kind, input?.value ?? '');
      if (stored === null) {
        input?.focus();
        return;
      }
      const duplicate = this.filters.some(
        (filter, index) => index !== editIndex && filter.value === stored
      );
      if (editIndex !== null) {
        this.filters.splice(
          0,
          this.filters.length,
          ...replaceExclusion(this.filters, editIndex, stored)
        );
      } else if (!duplicate) {
        this.filters.push({ value: stored });
      }
      await this.save();
    };

    setting.addDropdown(dropdown => {
      const options: EditableKind[] =
        kind === 'other' ? [...EXCLUSION_KINDS, 'other'] : [...EXCLUSION_KINDS];
      for (const option of options) {
        dropdown.addOption(option, typeLabels[option]);
      }
      dropdown.selectEl.setAttr('aria-label', labels.exclusionTypeLabel);
      dropdown.setValue(kind).onChange(value => {
        kind = value as EditableKind;
        input?.setAttr('placeholder', placeholders[kind]);
        this.suggest?.reset();
        input?.focus();
      });
    });
    setting.addText(text => {
      input = text.inputEl;
      text.setPlaceholder(placeholders[kind]);
      if (current) text.setValue(current.value);
      input.setAttr('aria-label', labels.exclusionValueLabel);
      this.suggest = new ExclusionValueSuggest(this.plugin.app, input, () =>
        kind === 'other' ? 'tag' : kind
      );
    });
    setting.addButton(button =>
      button
        .setButtonText(
          editIndex === null
            ? labels.exclusionAddConfirm
            : strings().common.save
        )
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
