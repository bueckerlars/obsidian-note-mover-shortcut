import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';

export class IndexSettingsSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private onChange: () => void
  ) {}

  public addIndexSettings(): void {
    const { containerEl } = this;

    const heading = new Setting(containerEl)
      .setName('Index & Performance')
      .setHeading();
    heading.setDesc(
      'Experimental feature: The index cache is under active development and may cause unexpected behavior. Use with caution and disable it if issues occur.'
    );
    const experimentalBadge = heading.nameEl.createEl('span', {
      text: 'Experimental',
    });
    experimentalBadge.classList.add('nms-badge', 'nms-badge--experimental');

    new Setting(containerEl)
      .setName('Enable Index Cache')
      .setDesc('Use a persistent index to speed up bulk/periodic operations')
      .addToggle(toggle =>
        toggle
          .setValue(!!this.plugin.settings.settings.indexing?.enableIndexCache)
          .onChange(async v => {
            const s = (this.plugin.settings as any).settings;
            s.indexing = s.indexing || ({} as any);
            s.indexing.enableIndexCache = v;
            await this.plugin.save_settings();
            this.onChange();
          })
      );

    new Setting(containerEl)
      .setName('Detection Mode')
      .setDesc('Change detection strategy (mtime+size or content hash)')
      .addDropdown(drop =>
        drop
          .addOption('mtimeSize', 'mtime + size (fast)')
          .addOption('hash', 'content hash (precise, slower)')
          .setValue(
            ((this.plugin.settings as any).settings?.indexing
              ?.detectionMode as any) || 'mtimeSize'
          )
          .onChange(async v => {
            const s = (this.plugin.settings as any).settings;
            s.indexing = s.indexing || ({} as any);
            s.indexing.detectionMode = v as any;
            await this.plugin.save_settings();
            this.onChange();
          })
      );

    new Setting(containerEl)
      .setName('Max Excerpt Bytes')
      .setDesc('0 disables content excerpts; small values reduce memory/IO')
      .addText(text =>
        text
          .setPlaceholder('0')
          .setValue(
            String(
              ((this.plugin.settings as any).settings?.indexing
                ?.maxExcerptBytes as any) ?? 0
            )
          )
          .onChange(async v => {
            const n = Math.max(0, Number(v) || 0);
            const s = (this.plugin.settings as any).settings;
            s.indexing = s.indexing || ({} as any);
            s.indexing.maxExcerptBytes = n;
            await this.plugin.save_settings();
          })
      );
  }
}
