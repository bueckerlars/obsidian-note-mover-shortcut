import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { SETTINGS_CONSTANTS } from '../../config/constants';

export class FilterSettingsSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addFilterSettings(): void {
    // Filter settings
    new Setting(this.containerEl).setName('Filter').setHeading();

    new Setting(this.containerEl)
      .setName('Filter mode')
      .setDesc('Choose between blacklist or whitelist mode')
      .addDropdown(dropdown =>
        dropdown
          .addOption('blacklist', 'Blacklist (exclude matching files)')
          .addOption('whitelist', 'Whitelist (include only matching files)')
          .setValue(
            this.plugin.settings.isFilterWhitelist ? 'whitelist' : 'blacklist'
          )
          .onChange(async value => {
            this.plugin.settings.isFilterWhitelist = value === 'whitelist';
            await this.plugin.save_settings();
            // Update RuleManager
            this.plugin.noteMover.updateRuleManager();
          })
      );

    this.addPeriodicMovementFilterArray();

    new Setting(this.containerEl).addButton(btn =>
      btn
        .setButtonText('Add new filter')
        .setCta()
        .onClick(async () => {
          this.plugin.settings.filter.push('');
          await this.plugin.save_settings();
          // Update RuleManager
          this.plugin.noteMover.updateRuleManager();
          this.refreshDisplay();
        })
    );
  }

  addPeriodicMovementFilterArray(): void {
    this.plugin.settings.filter.forEach((filter, index) => {
      const s = new Setting(this.containerEl)
        .addSearch(cb => {
          // AdvancedSuggest instead of TagSuggest
          new (require('../suggesters/AdvancedSuggest').AdvancedSuggest)(
            this.app,
            cb.inputEl
          );
          cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.FILTER)
            .setValue(filter || '')
            .onChange(async value => {
              // Don't save empty filters
              if (!value || value.trim() === '') {
                this.plugin.settings.filter[index] = '';
              } else {
                this.plugin.settings.filter[index] = value;
              }
              await this.plugin.save_settings();
              // Update RuleManager
              this.plugin.noteMover.updateRuleManager();
            });
          // @ts-ignore
          cb.containerEl.addClass('note_mover_search');
        })
        .addExtraButton(btn =>
          btn.setIcon('up-chevron-glyph').onClick(() => {
            this.moveFilter(index, -1);
          })
        )
        .addExtraButton(btn =>
          btn.setIcon('down-chevron-glyph').onClick(() => {
            this.moveFilter(index, 1);
          })
        )
        .addExtraButton(btn =>
          btn.setIcon('cross').onClick(async () => {
            this.plugin.settings.filter.splice(index, 1);
            await this.plugin.save_settings();
            // Update RuleManager
            this.plugin.noteMover.updateRuleManager();
            this.refreshDisplay();
          })
        );
      s.infoEl.remove();
    });
  }

  moveFilter(index: number, direction: number) {
    const newIndex = Math.max(
      0,
      Math.min(this.plugin.settings.filter.length - 1, index + direction)
    );
    [
      this.plugin.settings.filter[index],
      this.plugin.settings.filter[newIndex],
    ] = [
      this.plugin.settings.filter[newIndex],
      this.plugin.settings.filter[index],
    ];
    this.plugin.save_settings();
    this.refreshDisplay();
  }

  private get app(): App {
    return this.plugin.app;
  }
}
