import AdvancedNoteMoverPlugin from 'main';
import { Setting } from 'obsidian';
import { NoticeManager } from '../../utils/NoticeManager';

/**
 * Vault index cache toggle, performance debug logging, and trace export.
 */
export class PerformanceDebugSettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addPerformanceDebugSettings(): void {
    new Setting(this.containerEl).setName('Performance').setHeading();

    const cacheDesc = document.createDocumentFragment();
    cacheDesc.append(
      'Cache rule evaluation results so unchanged files are not re-evaluated on every periodic or on-edit run.',
      document.createElement('br'),
      'This significantly improves performance for vaults with many files and rules.'
    );

    new Setting(this.containerEl)
      .setName('Enable rule evaluation cache')
      .setDesc(cacheDesc)
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.settings.settings.enableRuleEvaluationCache ?? true
          )
          .onChange(async value => {
            this.plugin.settings.settings.enableRuleEvaluationCache = value;
            await this.plugin.save_settings();
            if (!value) {
              this.plugin.ruleCache.invalidateAll();
            }
          })
      );

    new Setting(this.containerEl)
      .setName('Enable vault index cache')
      .setDesc(
        'Caches movable file lists (notes, canvases, bases) and derived tag/property indices from markdown. Turn off to always scan the vault (useful for debugging stale suggestions).'
      )
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.settings.settings.enableVaultIndexCache !== false
          )
          .onChange(async value => {
            this.plugin.settings.settings.enableVaultIndexCache = value;
            await this.plugin.save_settings();
            this.plugin.vaultIndexCache.invalidateMovableFileList();
            this.plugin.vaultIndexCache.invalidateMarkdownList();
            this.refreshDisplay();
          })
      );

    new Setting(this.containerEl)
      .setName('Enable performance debug logs')
      .setDesc(
        'Logs timing spans to the developer console as [Advanced Note Mover perf] and records them for export. Disable when not profiling.'
      )
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.settings.settings.enablePerformanceDebug === true
          )
          .onChange(async value => {
            this.plugin.settings.settings.enablePerformanceDebug = value;
            await this.plugin.save_settings();
            this.refreshDisplay();
          })
      );

    const debugOn =
      this.plugin.settings.settings.enablePerformanceDebug === true;

    new Setting(this.containerEl)
      .setName('Export performance trace')
      .setDesc(
        debugOn
          ? 'Writes recorded timings as JSON to _note-mover-traces/ in your vault for before/after comparison.'
          : 'Turn on performance debug logs first to record timings.'
      )
      .addButton(btn =>
        btn
          .setButtonText('Export trace JSON')
          .setDisabled(!debugOn)
          .onClick(async () => {
            if (this.plugin.settings.settings.enablePerformanceDebug !== true) {
              NoticeManager.warning(
                'Enable performance debug logs first, then run the actions you want to measure.'
              );
              return;
            }
            try {
              const path =
                await this.plugin.performanceTrace.writeExportToVault(
                  this.plugin.app
                );
              NoticeManager.success(`Performance trace saved: ${path}`);
            } catch (err) {
              NoticeManager.error(
                `Could not export trace: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          })
      );
  }
}
