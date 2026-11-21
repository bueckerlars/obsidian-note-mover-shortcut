import AdvancedNoteMoverPlugin from 'main';
import { strings } from '../../i18n/locale';
import { Setting } from 'obsidian';
import { setDebugEnabled } from '../../utils/debug';
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
    new Setting(this.containerEl)
      .setName(strings().settings.headingsPerformance)
      .setHeading();

    const cacheDesc = createFragment();
    cacheDesc.append(
      'Cache rule evaluation results so unchanged files are not re-evaluated on every periodic or on-edit run.',
      createEl('br'),
      'This significantly improves performance for vaults with many files and rules.'
    );

    new Setting(this.containerEl)
      .setName(strings().settings.performanceCacheName)
      .setDesc(cacheDesc)
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.pluginData.settings.enableRuleEvaluationCache ?? true
          )
          .onChange(async value => {
            this.plugin.pluginData.settings.enableRuleEvaluationCache = value;
            await this.plugin.save_settings();
            if (!value) {
              this.plugin.ruleCache.invalidateAll();
            }
          })
      );

    new Setting(this.containerEl)
      .setName(strings().settings.performanceVaultCacheName)
      .setDesc(
        'Caches movable file lists (notes, canvases, bases) and derived tag/property indices from markdown. Turn off to always scan the vault (useful for debugging stale suggestions).'
      )
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.pluginData.settings.enableVaultIndexCache !== false
          )
          .onChange(async value => {
            this.plugin.pluginData.settings.enableVaultIndexCache = value;
            await this.plugin.save_settings();
            this.plugin.vaultIndexCache.invalidateMovableFileList();
            this.plugin.vaultIndexCache.invalidateMarkdownList();
            this.refreshDisplay();
          })
      );

    new Setting(this.containerEl)
      .setName(strings().settings.performanceDebugName)
      .setDesc(
        'Logs timing spans to the developer console as [Advanced Note Mover perf] and records them for export. Disable when not profiling.'
      )
      .addToggle(toggle =>
        toggle
          .setValue(
            this.plugin.pluginData.settings.enablePerformanceDebug === true
          )
          .onChange(async value => {
            this.plugin.pluginData.settings.enablePerformanceDebug = value;
            setDebugEnabled(value);
            await this.plugin.save_settings();
            this.refreshDisplay();
          })
      );

    const debugOn =
      this.plugin.pluginData.settings.enablePerformanceDebug === true;

    new Setting(this.containerEl)
      .setName(strings().settings.performanceExportName)
      .setDesc(
        debugOn
          ? 'Downloads recorded timings as JSON for before/after comparison.'
          : 'Turn on performance debug logs first to record timings.'
      )
      .addButton(btn =>
        btn
          .setButtonText(strings().settings.performanceExportButton)
          .setDisabled(!debugOn)
          .onClick(async () => {
            if (
              this.plugin.pluginData.settings.enablePerformanceDebug !== true
            ) {
              NoticeManager.warning(
                'Enable performance debug logs first, then run the actions you want to measure.'
              );
              return;
            }
            try {
              const fileName =
                await this.plugin.performanceTrace.downloadExport();
              if (fileName) {
                NoticeManager.success(
                  `Performance trace downloaded: ${fileName}`
                );
              }
            } catch (err) {
              NoticeManager.error(
                `Could not export trace: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          })
      );
  }
}
