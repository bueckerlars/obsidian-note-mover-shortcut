import type AdvancedNoteMoverPlugin from 'main';

export type SettingsPage = 'main' | 'importExport' | 'performance' | 'skipped';

/** What every settings section needs from the tab. */
export interface SectionContext {
  plugin: AdvancedNoteMoverPlugin;
  containerEl: HTMLElement;
  /** Debounced re-render of the current page. */
  refresh: () => void;
  navigate: (page: SettingsPage) => void;
}
