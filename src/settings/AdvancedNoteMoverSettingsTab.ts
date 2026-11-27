import AdvancedNoteMoverPlugin from 'main';
import { ExtraButtonComponent, PluginSettingTab } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import {
  AdvancedSettingsSection,
  AutomaticSettingsSection,
  FilterSettingsSection,
  HistorySettingsSection,
  ImportExportSettingsSection,
  PerformanceDebugSettingsSection,
  RulesSettingsSection,
  SkippedNotesSettingsSection,
  StatusSettingsSection,
  WhenMovingSettingsSection,
} from './sections';
import type { RulesUiState } from './sections/RulesSettingsSection';
import type { SectionContext, SettingsPage } from './pages';
import { associateSettingLabels } from '../domain/a11y/associateSettingLabels';
import { strings } from '../i18n/locale';
import { DebounceManager } from '../utils/DebounceManager';
import { MobileUtils } from '../utils/MobileUtils';

export class AdvancedNoteMoverSettingsTab extends PluginSettingTab {
  private filterSettings?: FilterSettingsSection;
  private rulesSettings?: RulesSettingsSection;
  private page: SettingsPage = 'main';
  /** Wrapper of the rendered page, so a page can move as one element. */
  private pageEl?: HTMLElement;
  /** Where the main page was scrolled before a sub-page opened. */
  private mainScrollTop = 0;
  private readonly rulesUi: RulesUiState = { query: '', moved: null };
  private debounceManager: DebounceManager;
  private readonly refreshSettings: () => void;

  constructor(private plugin: AdvancedNoteMoverPlugin) {
    super(plugin.app, plugin);

    this.debounceManager = new DebounceManager();
    this.refreshSettings = this.debounceManager.debounce(
      'display',
      () => this.renderSettingsTab(),
      150
    );
  }

  display(): void {
    this.renderSettingsTab();
  }

  /** Sets the page the next render shows. Call before opening the tab. */
  showPage(page: SettingsPage): void {
    this.page = page;
  }

  /** Scrolls an already rendered section heading into view. */
  scrollToSection(section: 'exclusions' | 'history'): void {
    const labels = strings().settings;
    const heading =
      section === 'history' ? labels.headingsHistory : labels.exclusionsHeading;
    this.containerEl
      .findAll('.setting-item-heading')
      .find(el => el.textContent?.includes(heading))
      ?.scrollIntoView({ block: 'start' });
  }

  /**
   * Obsidian skips display() when this returns items. The sections render the
   * tab, so this stays empty and settings search on 1.13 does not list them.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [];
  }

  hide(): void {
    this.cleanupExistingSections();
    this.pageEl = undefined;
    this.page = 'main';
    this.mainScrollTop = 0;
    this.rulesUi.query = '';
    this.rulesUi.moved = null;
    super.hide();
  }

  private navigate(page: SettingsPage): void {
    const scroller = this.containerEl.closest('.vertical-tab-content');
    const leavingScrollTop = scroller?.scrollTop ?? 0;
    if (this.page === 'main') this.mainScrollTop = leavingScrollTop;
    // The old page stays on screen so both can move.
    const leaving = this.pageEl;
    this.page = page;
    this.renderSettingsTab();
    scroller?.scrollTo({ top: page === 'main' ? this.mainScrollTop : 0 });
    if (leaving) this.animatePageChange(leaving, leavingScrollTop);
  }

  /** Same motion as Obsidian's own settings sub-pages (1.13+). */
  private animatePageChange(
    leaving: HTMLElement,
    leavingScrollTop: number
  ): void {
    const { containerEl, pageEl } = this;
    if (
      !pageEl ||
      containerEl.win.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const opening = this.page !== 'main';
    leaving.addClass('advancedNoteMover-page-leaving');
    leaving.toggleClass('is-on-top', !opening);
    leaving.setAttrs({ 'aria-hidden': 'true', inert: '' });
    containerEl.appendChild(leaving);
    leaving.setCssStyles({
      top: `${containerEl.scrollTop}px`,
      height: `${containerEl.clientHeight}px`,
    });
    leaving.scrollTop = leavingScrollTop;

    if (opening) {
      // The new page covers the old one, so it needs the container's padding.
      const { paddingTop, paddingRight, paddingBottom, paddingLeft } =
        containerEl.win.getComputedStyle(containerEl);
      pageEl.addClass('advancedNoteMover-page-entering');
      pageEl.setCssStyles({
        margin: `-${paddingTop} -${paddingRight} -${paddingBottom} -${paddingLeft}`,
        padding: `${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`,
        minHeight: `${containerEl.clientHeight}px`,
      });
    }

    const at = (x: number, opacity = 1) => ({
      transform: `translateX(${x}%)`,
      opacity,
    });
    const top = opening ? pageEl : leaving;
    const below = opening ? leaving : pageEl;
    const covered = at(-20, 0.65);
    below.animate(opening ? [at(0), covered] : [covered, at(0)], {
      duration: 150,
      easing: 'ease-out',
      fill: opening ? 'forwards' : 'none',
    });
    top.animate(opening ? [at(100), at(0)] : [at(0), at(100)], {
      duration: 150,
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
      fill: opening ? 'none' : 'forwards',
    }).onfinish = () => {
      leaving.remove();
      pageEl.removeClass('advancedNoteMover-page-entering');
      pageEl.setCssStyles({ margin: '', padding: '', minHeight: '' });
    };
  }

  private renderSettingsTab(): void {
    const scroller = this.containerEl.closest('.vertical-tab-content');
    const scrollTop = scroller?.scrollTop ?? 0;
    this.containerEl.empty();

    // Add mobile-specific classes to container
    this.containerEl.addClass('advancedNoteMover-settings-root');
    this.containerEl.addClass('advancedNoteMover-focus-scope');
    MobileUtils.addMobileClass(this.containerEl);
    if (MobileUtils.isMobile()) {
      scroller?.addClass('advancedNoteMover-settings-vertical-tab');
    }

    // Clean up existing section instances before creating new ones
    this.cleanupExistingSections();

    // Ensure arrays exist but don't remove empty rules during display
    this.ensureArraysExist();

    this.pageEl = this.containerEl.createDiv();
    const ctx: SectionContext = {
      plugin: this.plugin,
      containerEl: this.pageEl,
      refresh: this.refreshSettings,
      navigate: page => this.navigate(page),
    };

    if (this.page === 'main') {
      this.renderMain(ctx);
    } else {
      this.renderSubPage(ctx);
    }
    associateSettingLabels(this.containerEl);
    scroller?.scrollTo({ top: scrollTop });
  }

  private renderMain(ctx: SectionContext): void {
    new StatusSettingsSection(ctx).render();
    new AutomaticSettingsSection(ctx).render();
    this.rulesSettings = new RulesSettingsSection(
      this.plugin,
      ctx.containerEl,
      ctx.refresh,
      this.rulesUi
    );
    this.rulesSettings.render();
    this.filterSettings = new FilterSettingsSection(
      this.plugin,
      ctx.containerEl,
      ctx.refresh
    );
    this.filterSettings.render();
    new WhenMovingSettingsSection(ctx).render();
    new HistorySettingsSection(ctx).render();
    new AdvancedSettingsSection(ctx).render();
  }

  private renderSubPage(ctx: SectionContext): void {
    const labels = strings().settings;
    const titles: Record<Exclude<SettingsPage, 'main'>, string> = {
      importExport: labels.importExportNavName,
      performance: labels.performanceNavName,
      skipped: labels.skippedTitle,
    };
    const head = ctx.containerEl.createDiv({
      cls: 'advancedNoteMover-subpage-head',
    });
    new ExtraButtonComponent(head)
      .setIcon('arrow-left')
      .setTooltip(labels.backLabel)
      .onClick(() => this.navigate('main'))
      .extraSettingsEl.setAttrs({
        'aria-label': labels.backLabel,
        role: 'button',
      });
    head.createDiv({
      cls: 'advancedNoteMover-subpage-title',
      text: titles[this.page as Exclude<SettingsPage, 'main'>],
    });

    if (this.page === 'importExport') {
      new ImportExportSettingsSection(ctx).render();
    } else if (this.page === 'performance') {
      new PerformanceDebugSettingsSection(ctx).render();
    } else {
      new SkippedNotesSettingsSection(ctx).render();
    }
  }

  /**
   * Ensure filter array exists without removing empty rules during display
   */
  private ensureArraysExist(): void {
    if (!this.plugin.pluginData.settings.filters) {
      this.plugin.pluginData.settings.filters = { filter: [] };
    }
    if (!Array.isArray(this.plugin.pluginData.settings.filters.filter)) {
      this.plugin.pluginData.settings.filters.filter = [];
    }
  }

  /**
   * Clean up existing section instances to prevent memory leaks
   */
  private cleanupExistingSections(): void {
    this.filterSettings?.cleanup();
    this.rulesSettings?.cleanup();
  }

  /**
   * Cleanup method to cancel any pending debounced operations and clean up sections
   */
  cleanup(): void {
    this.debounceManager.cancelAll();
    this.cleanupExistingSections();
  }
}
