import { NoteMoverShortcutSettingsTab } from '../Settings';
import { DebounceManager } from '../../utils/DebounceManager';

// Mock DebounceManager
jest.mock('../../utils/DebounceManager', () => ({
  DebounceManager: jest.fn().mockImplementation(() => ({
    debounce: jest.fn().mockImplementation((key, fn, delay) => fn),
    cancelAll: jest.fn(),
  })),
}));

// Mock all settings sections
jest.mock('../sections', () => ({
  PeriodicMovementSettingsSection: jest.fn().mockImplementation(() => ({
    addTriggerSettings: jest.fn(),
    cleanup: jest.fn(),
  })),
  FilterSettingsSection: jest.fn().mockImplementation(() => ({
    addFilterSettings: jest.fn(),
    cleanup: jest.fn(),
  })),
  RulesSettingsSection: jest.fn().mockImplementation(() => ({
    addRulesSetting: jest.fn(),
    addRulesArray: jest.fn(),
    addAddRuleButtonSetting: jest.fn(),
    cleanup: jest.fn(),
  })),
  HistorySettingsSection: jest.fn().mockImplementation(() => ({
    addHistorySettings: jest.fn(),
  })),
  ImportExportSettingsSection: jest.fn().mockImplementation(() => ({
    addImportExportSettings: jest.fn(),
  })),
}));

// Mock Obsidian
jest.mock('obsidian', () => ({
  PluginSettingTab: class {
    constructor(
      public app: any,
      public plugin: any
    ) {}
  },
}));

describe('NoteMoverShortcutSettingsTab', () => {
  let mockPlugin: any;
  let settingsTab: NoteMoverShortcutSettingsTab;
  let mockContainerEl: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock container element with empty method
    mockContainerEl = document.createElement('div');
    mockContainerEl.empty = jest.fn();

    // Mock plugin
    mockPlugin = {
      app: {
        vault: {
          getMarkdownFiles: jest.fn().mockReturnValue([]),
          getAllLoadedFiles: jest.fn().mockReturnValue([]),
        },
        metadataCache: {
          getFileCache: jest.fn().mockReturnValue(null),
        },
      },
      settings: {
        settings: {
          rules: [
            { criteria: 'tag: #work', path: '/work' },
            { criteria: 'fileName: notes.md', path: '/notes' },
          ],
          filters: { filter: [{ value: 'filter1' }, { value: 'filter2' }] },
        },
      },
    };

    // Create settings tab
    settingsTab = new NoteMoverShortcutSettingsTab(mockPlugin);
    settingsTab.containerEl = mockContainerEl;
  });

  describe('constructor', () => {
    it('should create debounce manager', () => {
      expect(DebounceManager).toHaveBeenCalled();
    });

    it('should initialize all section instances', () => {
      expect(settingsTab).toBeDefined();
    });
  });

  describe('display', () => {
    it('should empty container and create new sections', () => {
      const emptySpy = jest.spyOn(mockContainerEl, 'empty');
      settingsTab.display();

      // Container should be emptied
      expect(emptySpy).toHaveBeenCalled();
    });

    it('should call ensureArraysExist', () => {
      const spy = jest.spyOn(settingsTab as any, 'ensureArraysExist');
      settingsTab.display();

      expect(spy).toHaveBeenCalled();
    });

    it('should call cleanupExistingSections', () => {
      const spy = jest.spyOn(settingsTab as any, 'cleanupExistingSections');
      settingsTab.display();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('ensureArraysExist', () => {
    it('should ensure rules array exists', () => {
      mockPlugin.settings.settings.rules = null;
      (settingsTab as any).ensureArraysExist();

      expect(Array.isArray(mockPlugin.settings.settings.rules)).toBe(true);
    });

    it('should ensure filter array exists', () => {
      mockPlugin.settings.settings.filters.filter = null;
      (settingsTab as any).ensureArraysExist();

      expect(Array.isArray(mockPlugin.settings.settings.filters.filter)).toBe(
        true
      );
    });

    it('should not modify existing valid arrays', () => {
      const originalRules = mockPlugin.settings.settings.rules;
      const originalFilter = mockPlugin.settings.settings.filters.filter;

      (settingsTab as any).ensureArraysExist();

      expect(mockPlugin.settings.settings.rules).toBe(originalRules);
      expect(mockPlugin.settings.settings.filters.filter).toBe(originalFilter);
    });
  });

  describe('cleanupExistingSections', () => {
    it('should call cleanup on filterSettings if it exists and has cleanup method', () => {
      const mockCleanup = jest.fn();
      (settingsTab as any).filterSettings = { cleanup: mockCleanup };

      (settingsTab as any).cleanupExistingSections();

      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should call cleanup on rulesSettings if it exists and has cleanup method', () => {
      const mockCleanup = jest.fn();
      (settingsTab as any).rulesSettings = { cleanup: mockCleanup };

      (settingsTab as any).cleanupExistingSections();

      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should handle missing sections gracefully', () => {
      (settingsTab as any).filterSettings = null;
      (settingsTab as any).rulesSettings = null;

      expect(() => {
        (settingsTab as any).cleanupExistingSections();
      }).not.toThrow();
    });

    it('should handle sections without cleanup method gracefully', () => {
      (settingsTab as any).filterSettings = {};
      (settingsTab as any).rulesSettings = {};

      expect(() => {
        (settingsTab as any).cleanupExistingSections();
      }).not.toThrow();
    });
  });

  describe('validateSettings', () => {
    it('should remove invalid rules with empty criteria', () => {
      mockPlugin.settings.settings.rules = [
        { criteria: '', path: '/valid' },
        { criteria: 'tag: #work', path: '/work' },
        { criteria: '   ', path: '/whitespace' },
      ];

      (settingsTab as any).validateSettings();

      expect(mockPlugin.settings.settings.rules).toHaveLength(1);
      expect(mockPlugin.settings.settings.rules[0].criteria).toBe('tag: #work');
    });

    it('should remove invalid rules with empty path', () => {
      mockPlugin.settings.settings.rules = [
        { criteria: 'tag: #work', path: '' },
        { criteria: 'tag: #project', path: '/project' },
        { criteria: 'tag: #test', path: '   ' },
      ];

      (settingsTab as any).validateSettings();

      expect(mockPlugin.settings.settings.rules).toHaveLength(1);
      expect(mockPlugin.settings.settings.rules[0].path).toBe('/project');
    });

    it('should remove null/undefined rules', () => {
      mockPlugin.settings.settings.rules = [
        null,
        { criteria: 'tag: #work', path: '/work' },
        undefined,
      ];

      (settingsTab as any).validateSettings();

      expect(mockPlugin.settings.settings.rules).toHaveLength(1);
      expect(mockPlugin.settings.settings.rules[0].criteria).toBe('tag: #work');
    });

    it('should remove empty filters', () => {
      mockPlugin.settings.settings.filters.filter = [
        { value: '' },
        { value: 'valid-filter' },
        { value: '   ' },
        null,
        undefined,
      ];

      (settingsTab as any).validateSettings();

      expect(mockPlugin.settings.settings.filters.filter).toHaveLength(1);
      expect(mockPlugin.settings.settings.filters.filter[0].value).toBe(
        'valid-filter'
      );
    });

    it('should call ensureArraysExist', () => {
      const spy = jest.spyOn(settingsTab as any, 'ensureArraysExist');

      (settingsTab as any).validateSettings();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should call cancelAll on debounceManager', () => {
      const mockCancelAll = jest.fn();
      (settingsTab as any).debounceManager = { cancelAll: mockCancelAll };

      settingsTab.cleanup();

      expect(mockCancelAll).toHaveBeenCalled();
    });

    it('should call cleanupExistingSections', () => {
      const spy = jest.spyOn(settingsTab as any, 'cleanupExistingSections');

      settingsTab.cleanup();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('validateSettings', () => {
    it('should remove invalid rules with empty criteria', () => {
      mockPlugin.settings.settings.rules = [
        { criteria: '', path: '/valid' },
        { criteria: 'tag: #test', path: '/valid' },
        { criteria: '   ', path: '/valid' },
      ];

      (settingsTab as any).validateSettings();

      expect(mockPlugin.settings.settings.rules).toHaveLength(1);
      expect(mockPlugin.settings.settings.rules[0].criteria).toBe('tag: #test');
    });

    it('should remove invalid rules with empty path', () => {
      mockPlugin.settings.settings.rules = [
        { criteria: 'tag: #test', path: '' },
        { criteria: 'tag: #test2', path: '/valid' },
        { criteria: 'tag: #test3', path: '   ' },
      ];

      (settingsTab as any).validateSettings();

      expect(mockPlugin.settings.settings.rules).toHaveLength(1);
      expect(mockPlugin.settings.settings.rules[0].criteria).toBe(
        'tag: #test2'
      );
    });

    it('should remove null/undefined rules', () => {
      mockPlugin.settings.settings.rules = [
        null,
        { criteria: 'tag: #test', path: '/valid' },
        undefined,
        { criteria: 'tag: #test2', path: '/valid2' },
      ];

      (settingsTab as any).validateSettings();

      expect(mockPlugin.settings.settings.rules).toHaveLength(2);
      expect(mockPlugin.settings.settings.rules[0].criteria).toBe('tag: #test');
      expect(mockPlugin.settings.settings.rules[1].criteria).toBe(
        'tag: #test2'
      );
    });

    it('should remove empty filters', () => {
      mockPlugin.settings.settings.filters.filter = [
        { value: '' },
        { value: 'valid-filter' },
        { value: '   ' },
        { value: 'another-valid' },
      ];

      (settingsTab as any).validateSettings();

      expect(mockPlugin.settings.settings.filters.filter).toHaveLength(2);
      expect(
        mockPlugin.settings.settings.filters.filter.map((f: any) => f.value)
      ).toContain('valid-filter');
      expect(
        mockPlugin.settings.settings.filters.filter.map((f: any) => f.value)
      ).toContain('another-valid');
    });

    it('should call ensureArraysExist', () => {
      const ensureArraysExistSpy = jest.spyOn(
        settingsTab as any,
        'ensureArraysExist'
      );

      (settingsTab as any).validateSettings();

      expect(ensureArraysExistSpy).toHaveBeenCalled();
    });
  });
});
