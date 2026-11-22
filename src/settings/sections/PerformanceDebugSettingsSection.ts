import { fill, strings } from '../../i18n/locale';
import { setDebugEnabled } from '../../utils/debug';
import { formatDateTime } from '../../utils/formatDate';
import { NoticeManager } from '../../utils/NoticeManager';
import { createSettingGroup } from '../settingGroup';
import type { SectionContext } from '../pages';

/** "Performance and troubleshooting" sub-page. */
export class PerformanceDebugSettingsSection {
  constructor(private readonly ctx: SectionContext) {}

  render(): void {
    const { plugin, containerEl, refresh } = this.ctx;
    const labels = strings().settings;
    const settings = plugin.pluginData.settings;

    const speed = createSettingGroup(containerEl, {
      heading: labels.performanceSpeed,
    });
    speed.addSetting(setting =>
      setting
        .setName(labels.performanceCacheName)
        .setDesc(labels.performanceCacheDesc)
        .addToggle(toggle =>
          toggle
            .setValue(settings.enableRuleEvaluationCache ?? true)
            .onChange(async value => {
              settings.enableRuleEvaluationCache = value;
              await plugin.save_settings();
              if (!value) {
                plugin.ruleCache.invalidateAll();
              }
            })
        )
    );
    speed.addSetting(setting =>
      setting
        .setName(labels.performanceVaultCacheName)
        .setDesc(labels.performanceVaultCacheDesc)
        .addToggle(toggle =>
          toggle
            .setValue(settings.enableVaultIndexCache !== false)
            .onChange(async value => {
              settings.enableVaultIndexCache = value;
              await plugin.save_settings();
              plugin.vaultIndexCache.invalidateMovableFileList();
              plugin.vaultIndexCache.invalidateMarkdownList();
            })
        )
    );

    const debugOn = settings.enablePerformanceDebug === true;
    const trouble = createSettingGroup(containerEl, {
      heading: labels.performanceTroubleshooting,
    });
    trouble.addSetting(setting =>
      setting
        .setName(labels.performanceDebugName)
        .setDesc(labels.performanceDebugDesc)
        .addToggle(toggle =>
          toggle.setValue(debugOn).onChange(async value => {
            settings.enablePerformanceDebug = value;
            setDebugEnabled(value);
            await plugin.save_settings();
            refresh();
          })
        )
    );
    if (debugOn) {
      const { count, since } = plugin.performanceTrace.summary();
      const desc =
        count === 0 || since === null
          ? labels.performanceExportDescEmpty
          : fill(
              count === 1
                ? labels.performanceExportDescOne
                : labels.performanceExportDescMany,
              { count, time: formatDateTime(since) }
            );
      trouble.addSetting(setting => {
        setting
          .setName(labels.performanceExportName)
          .setDesc(desc)
          .addButton(button =>
            button
              .setButtonText(labels.performanceExportButton)
              .onClick(async () => {
                try {
                  const fileName =
                    await plugin.performanceTrace.downloadExport();
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
        setting.settingEl.addClass('advancedNoteMover-sub-row');
      });
    }
    trouble.addSetting(setting =>
      setting
        .setName(labels.releaseNotesName)
        .setDesc(
          fill(labels.releaseNotesDesc, { version: plugin.manifest.version })
        )
        .addButton(button =>
          button.setButtonText(labels.releaseNotesButton).onClick(() => {
            void plugin.updateManager.showUpdateModal(true);
          })
        )
    );
  }
}
