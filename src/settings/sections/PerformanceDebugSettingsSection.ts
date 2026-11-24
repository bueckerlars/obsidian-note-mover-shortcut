import AdvancedNoteMoverPlugin from 'main';
import { fill, strings } from '../../i18n/locale';
import { setDebugEnabled } from '../../utils/debug';
import { NoticeManager } from '../../utils/NoticeManager';
import { renderSetting } from '../settingDefinitions';

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
    renderSetting(this.containerEl, 'performance.heading');

    renderSetting(this.containerEl, 'performance.cache').addToggle(toggle =>
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

    renderSetting(this.containerEl, 'performance.vaultCache').addToggle(
      toggle =>
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

    renderSetting(this.containerEl, 'performance.debug').addToggle(toggle =>
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

    renderSetting(this.containerEl, 'performance.export')
      .setDesc(
        debugOn
          ? strings().settings.performanceExportReady
          : strings().settings.performanceExportOff
      )
      .addButton(btn =>
        btn
          .setButtonText(strings().settings.performanceExportButton)
          .setDisabled(!debugOn)
          .onClick(async () => {
            if (
              this.plugin.pluginData.settings.enablePerformanceDebug !== true
            ) {
              NoticeManager.warning(strings().notices.enableDebugFirst);
              return;
            }
            try {
              const fileName =
                await this.plugin.performanceTrace.downloadExport();
              if (fileName) {
                NoticeManager.success(
                  fill(strings().notices.traceDownloaded, { fileName })
                );
              }
            } catch (err) {
              NoticeManager.error(
                fill(strings().notices.couldNotExportTrace, {
                  message: err instanceof Error ? err.message : String(err),
                })
              );
            }
          })
      );
  }
}
