import { RulesSettingsSection } from '../RulesSettingsSection';

// Mock AdvancedSuggest
jest.mock('../../suggesters/AdvancedSuggest', () => ({
  AdvancedSuggest: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
}));

// Mock FolderSuggest
jest.mock('../../suggesters/FolderSuggest', () => ({
  FolderSuggest: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
}));

// Mock DragDropManager
jest.mock('../../../utils/DragDropManager', () => ({
  DragDropManager: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
  createDragHandle: jest.fn().mockReturnValue(document.createElement('div')),
}));

// Mock the static method
const DragDropManager =
  require('../../../utils/DragDropManager').DragDropManager;
DragDropManager.createDragHandle = jest
  .fn()
  .mockReturnValue(document.createElement('div'));

// Mock Obsidian Setting
jest.mock('obsidian', () => ({
  Setting: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setHeading: jest.fn().mockReturnThis(),
    setDesc: jest.fn().mockReturnThis(),
    addDropdown: jest.fn().mockImplementation(callback => {
      const dropdown: any = {
        addOption: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockImplementation(handler => {
          // Store the handler for later use
          dropdown._onChange = handler;
          return dropdown;
        }),
        _onChange: null,
      };
      callback(dropdown);
      return dropdown;
    }),
    addButton: jest.fn().mockImplementation(callback => {
      const button: any = {
        setButtonText: jest.fn().mockReturnThis(),
        setCta: jest.fn().mockReturnThis(),
        onClick: jest.fn().mockImplementation(handler => {
          // Store the handler for later use
          button._onClick = handler;
          return button;
        }),
        _onClick: null,
        click: jest.fn().mockImplementation(() => {
          if (button._onClick) {
            (button._onClick as any)();
          }
        }),
      };
      callback(button);
      return button;
    }),
    addSearch: jest.fn().mockImplementation(callback => {
      const search: any = {
        setPlaceholder: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockImplementation(handler => {
          // Store the handler for later use
          search._onChange = handler;
          return search;
        }),
        inputEl: document.createElement('input'),
        containerEl: {
          addClass: jest.fn(),
          classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(),
          },
        },
        _onChange: null,
      };
      callback(search);
      return {
        addSearch: jest.fn().mockImplementation(secondCallback => {
          const secondSearch: any = {
            setPlaceholder: jest.fn().mockReturnThis(),
            setValue: jest.fn().mockReturnThis(),
            onChange: jest.fn().mockImplementation(handler => {
              secondSearch._onChange = handler;
              return secondSearch;
            }),
            inputEl: document.createElement('input'),
            containerEl: {
              addClass: jest.fn(),
              classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(),
              },
            },
            _onChange: null,
          };
          secondCallback(secondSearch);
          return {
            addExtraButton: jest.fn().mockImplementation(btnCallback => {
              const button: any = {
                setIcon: jest.fn().mockReturnThis(),
                onClick: jest.fn().mockImplementation(handler => {
                  button._onClick = handler;
                  return button;
                }),
                _onClick: null,
              };
              btnCallback(button);
              return button;
            }),
          };
        }),
        addExtraButton: jest.fn().mockImplementation(btnCallback => {
          const button: any = {
            setIcon: jest.fn().mockReturnThis(),
            onClick: jest.fn().mockImplementation(handler => {
              button._onClick = handler;
              return button;
            }),
            _onClick: null,
          };
          btnCallback(button);
          return button;
        }),
      };
    }),
    addExtraButton: jest.fn().mockImplementation(callback => {
      const button: any = {
        setIcon: jest.fn().mockReturnThis(),
        onClick: jest.fn().mockImplementation(handler => {
          // Store the handler for later use
          button._onClick = handler;
          return button;
        }),
        _onClick: null,
      };
      callback(button);
      return button;
    }),
    settingEl: document.createElement('div'),
    infoEl: {
      remove: jest.fn(),
    },
  })),
}));

describe('RulesSettingsSection', () => {
  let mockPlugin: any;
  let mockContainerEl: HTMLElement;
  let mockRefreshDisplay: jest.Mock;
  let rulesSettingsSection: RulesSettingsSection;

  beforeEach(() => {
    jest.clearAllMocks();

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
        rules: [
          { criteria: 'tag: #work', path: '/work' },
          { criteria: 'fileName: notes.md', path: '/notes' },
        ],
      },
      save_settings: jest.fn(),
      noteMover: {
        updateRuleManager: jest.fn(),
      },
    };

    // Mock container element
    mockContainerEl = document.createElement('div');

    // Mock refresh display function
    mockRefreshDisplay = jest.fn();

    // Create RulesSettingsSection instance
    rulesSettingsSection = new RulesSettingsSection(
      mockPlugin,
      mockContainerEl,
      mockRefreshDisplay
    );
  });

  describe('addRulesSetting', () => {
    it('should execute without errors', () => {
      expect(() => {
        rulesSettingsSection.addRulesSetting();
      }).not.toThrow();
    });
  });

  describe('addAddRuleButtonSetting', () => {
    it('should execute without errors', () => {
      expect(() => {
        rulesSettingsSection.addAddRuleButtonSetting();
      }).not.toThrow();
    });
  });

  describe('addRulesArray', () => {
    it('should handle empty rules array', () => {
      mockPlugin.settings.rules = [];
      rulesSettingsSection.addRulesArray();

      const containers = mockContainerEl.querySelectorAll('.rules-container');
      expect(containers.length).toBe(1);
    });
  });

  describe('moveRule', () => {
    it('should move rule up', () => {
      const originalRules = [...mockPlugin.settings.rules];
      rulesSettingsSection.moveRule(1, -1);

      expect(mockPlugin.settings.rules[0]).toBe(originalRules[1]);
      expect(mockPlugin.settings.rules[1]).toBe(originalRules[0]);
    });

    it('should move rule down', () => {
      const originalRules = [...mockPlugin.settings.rules];
      rulesSettingsSection.moveRule(0, 1);

      expect(mockPlugin.settings.rules[0]).toBe(originalRules[1]);
      expect(mockPlugin.settings.rules[1]).toBe(originalRules[0]);
    });

    it('should not move rule beyond boundaries', () => {
      const originalRules = [...mockPlugin.settings.rules];
      rulesSettingsSection.moveRule(0, -1);

      expect(mockPlugin.settings.rules).toEqual(originalRules);
    });

    it('should not move rule beyond upper boundary', () => {
      const originalRules = [...mockPlugin.settings.rules];
      rulesSettingsSection.moveRule(1, 1);

      expect(mockPlugin.settings.rules).toEqual(originalRules);
    });
  });

  describe('private methods', () => {
    it('should handle reorderRules correctly', () => {
      // Test reorderRules method through moveRule
      const originalRules = [...mockPlugin.settings.rules];
      rulesSettingsSection.moveRule(1, -1);

      expect(mockPlugin.settings.rules[0]).toBe(originalRules[1]);
      expect(mockPlugin.settings.rules[1]).toBe(originalRules[0]);
    });

    it('should handle reorderRules with same index', () => {
      const originalRules = [...mockPlugin.settings.rules];
      rulesSettingsSection.moveRule(0, 0);

      expect(mockPlugin.settings.rules).toEqual(originalRules);
    });

    it('should return app from getter', () => {
      const app = (rulesSettingsSection as any).app;
      expect(app).toBe(mockPlugin.app);
    });
  });

  describe('addRulesSetting', () => {
    it('should execute without errors', () => {
      expect(() => {
        rulesSettingsSection.addRulesSetting();
      }).not.toThrow();
    });
  });

  describe('addAddRuleButtonSetting', () => {
    it('should execute without errors', () => {
      expect(() => {
        rulesSettingsSection.addAddRuleButtonSetting();
      }).not.toThrow();
    });
  });

  describe('addRulesArray', () => {
    it('should be callable', () => {
      // This test verifies the method exists and can be called
      expect(typeof rulesSettingsSection.addRulesArray).toBe('function');
    });
  });

  describe('reorderRules', () => {
    it('should reorder rules correctly', () => {
      mockPlugin.settings.rules = [
        { criteria: 'tag: #work', path: '/work' },
        { criteria: 'fileName: notes.md', path: '/notes' },
        { criteria: 'content: important', path: '/important' },
      ];
      const originalRules = [...mockPlugin.settings.rules];

      // Test reorderRules through moveRule
      rulesSettingsSection.moveRule(0, 2);

      expect(mockPlugin.settings.rules[0]).toBe(originalRules[2]);
      expect(mockPlugin.settings.rules[2]).toBe(originalRules[0]);
    });

    it('should not reorder when fromIndex equals toIndex', () => {
      mockPlugin.settings.rules = [
        { criteria: 'tag: #work', path: '/work' },
        { criteria: 'fileName: notes.md', path: '/notes' },
      ];
      const originalRules = [...mockPlugin.settings.rules];

      // Test through moveRule with same index
      rulesSettingsSection.moveRule(0, 0);

      expect(mockPlugin.settings.rules).toEqual(originalRules);
    });
  });

  describe('cleanupAdvancedSuggestInstances', () => {
    it('should clean up advanced suggest instances', () => {
      const cleanupSpy = jest.spyOn(
        rulesSettingsSection as any,
        'cleanupAdvancedSuggestInstances'
      );

      rulesSettingsSection.cleanup();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should handle cleanup when no instances exist', () => {
      // Call cleanup without creating any instances
      expect(() => {
        rulesSettingsSection.cleanup();
      }).not.toThrow();
    });

    it('should be safe to call cleanup multiple times', () => {
      // Call cleanup multiple times
      expect(() => {
        rulesSettingsSection.cleanup();
        rulesSettingsSection.cleanup();
        rulesSettingsSection.cleanup();
      }).not.toThrow();
    });

    it('should destroy drag drop manager', () => {
      // Mock the problematic method to avoid DOM issues
      const originalMethod = rulesSettingsSection as any;
      originalMethod.addDragHandle = jest.fn();

      const destroySpy = jest.fn();
      (rulesSettingsSection as any).dragDropManager = { destroy: destroySpy };

      rulesSettingsSection.cleanup();

      expect(destroySpy).toHaveBeenCalled();
    });
  });
});
