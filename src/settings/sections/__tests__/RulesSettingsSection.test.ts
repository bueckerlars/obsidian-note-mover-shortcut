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
      return {
        ...button,
        settingEl: document.createElement('div'),
        infoEl: { remove: jest.fn() },
      } as any;
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
              return {
                ...button,
                settingEl: document.createElement('div'),
                infoEl: { remove: jest.fn() },
              } as any;
            }),
            settingEl: document.createElement('div'),
            infoEl: { remove: jest.fn() },
          } as any;
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
          return {
            ...button,
            settingEl: document.createElement('div'),
            infoEl: { remove: jest.fn() },
          } as any;
        }),
        settingEl: document.createElement('div'),
        infoEl: { remove: jest.fn() },
      } as any;
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
      return {
        ...button,
        settingEl: document.createElement('div'),
        infoEl: { remove: jest.fn() },
      } as any;
    }),
    settingEl: document.createElement('div'),
    infoEl: {
      remove: jest.fn(),
    },
  })),
  Notice: jest
    .fn()
    .mockImplementation(() => ({ noticeEl: document.createElement('div') })),
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
        settings: {
          rules: [
            { criteria: 'tag: #work', path: '/work' },
            { criteria: 'fileName: notes.md', path: '/notes' },
          ],
          filters: { filter: [] },
          triggers: {
            enablePeriodicMovement: false,
            periodicMovementInterval: 5,
            enableOnEditTrigger: false,
          },
          retentionPolicy: { value: 30, unit: 'days' },
        },
        history: { history: [], bulkOperations: [] },
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
      mockPlugin.settings.settings.rules = [];
      rulesSettingsSection.addRulesArray();

      const containers = mockContainerEl.querySelectorAll('.rules-container');
      expect(containers.length).toBe(1);
    });

    it('should wire criteria onChange including duplicate branch', async () => {
      const { Setting } = require('obsidian');
      const originalImpl = (Setting as jest.Mock).getMockImplementation();
      // stub DOM-heavy method
      (rulesSettingsSection as any).addDragHandle = jest.fn();

      (Setting as jest.Mock).mockImplementation(() => {
        const api: any = {
          addSearch: jest.fn().mockImplementation(cb => {
            const first: any = {
              setPlaceholder: jest.fn().mockReturnThis(),
              setValue: jest.fn().mockReturnThis(),
              onChange: jest.fn().mockImplementation(h => {
                first._onChange = h;
                return first;
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
            };
            cb(first);
            api._criteria = first;
            return {
              addSearch: jest.fn().mockImplementation(cb2 => {
                const second: any = {
                  setPlaceholder: jest.fn().mockReturnThis(),
                  setValue: jest.fn().mockReturnThis(),
                  onChange: jest.fn().mockImplementation(h => {
                    second._onChange = h;
                    return second;
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
                };
                cb2(second);
                api._path = second;
                return {
                  addExtraButton: jest.fn().mockImplementation(btnCb => {
                    const b: any = {
                      setIcon: jest.fn().mockReturnThis(),
                      onClick: jest.fn().mockImplementation(h => {
                        b._onClick = h;
                        return b;
                      }),
                      _onClick: null,
                    };
                    btnCb(b);
                    api._extra = b;
                    return {
                      ...b,
                      settingEl: document.createElement('div'),
                      infoEl: { remove: jest.fn() },
                    } as any;
                  }),
                };
              }),
            };
          }),
          settingEl: document.createElement('div'),
          infoEl: { remove: jest.fn() },
        };
        return api;
      });

      rulesSettingsSection = new RulesSettingsSection(
        mockPlugin,
        mockContainerEl,
        mockRefreshDisplay
      );

      mockPlugin.settings.settings.rules = [{ criteria: 'dup', path: '/a' }];

      (rulesSettingsSection as any).addDragHandle = jest.fn();
      rulesSettingsSection.addRulesArray();

      const lastSettingInstance: any = (
        require('obsidian').Setting as any
      ).mock.results.pop().value;
      const criteria = lastSettingInstance._criteria;
      const path = lastSettingInstance._path;

      await criteria._onChange('newCriteria');
      expect(mockPlugin.save_settings).toHaveBeenCalled();
      expect(mockPlugin.noteMover.updateRuleManager).toHaveBeenCalled();
      expect(mockPlugin.settings.settings.rules[0].criteria).toBe(
        'newCriteria'
      );

      mockPlugin.settings.settings.rules.push({ criteria: 'dup', path: '/b' });
      await criteria._onChange('dup');
      expect(mockPlugin.settings.settings.rules[0].criteria).toBe(
        'newCriteria'
      );

      await path._onChange('/new');
      expect(mockPlugin.save_settings).toHaveBeenCalled();
      expect(mockPlugin.settings.settings.rules[0].path).toBe('/new');

      (Setting as jest.Mock).mockImplementation(originalImpl as any);
    });

    it('should handle remove rule button', async () => {
      const { Setting } = require('obsidian');
      const originalImpl = (Setting as jest.Mock).getMockImplementation();
      (rulesSettingsSection as any).addDragHandle = jest.fn();
      (Setting as jest.Mock).mockImplementation(() => {
        const api: any = {
          addSearch: jest.fn().mockImplementation(cb => {
            const first: any = {
              setPlaceholder: jest.fn().mockReturnThis(),
              setValue: jest.fn().mockReturnThis(),
              onChange: jest.fn().mockReturnThis(),
              inputEl: document.createElement('input'),
              containerEl: {
                addClass: jest.fn(),
                classList: {
                  add: jest.fn(),
                  remove: jest.fn(),
                  contains: jest.fn(),
                },
              },
            };
            cb(first);
            return {
              addSearch: jest.fn().mockImplementation(cb2 => {
                const second: any = {
                  setPlaceholder: jest.fn().mockReturnThis(),
                  setValue: jest.fn().mockReturnThis(),
                  onChange: jest.fn().mockReturnThis(),
                  inputEl: document.createElement('input'),
                  containerEl: {
                    addClass: jest.fn(),
                    classList: {
                      add: jest.fn(),
                      remove: jest.fn(),
                      contains: jest.fn(),
                    },
                  },
                };
                cb2(second);
                return {
                  addExtraButton: jest.fn().mockImplementation(btnCb => {
                    const b: any = {
                      setIcon: jest.fn().mockReturnThis(),
                      onClick: jest.fn().mockImplementation(h => {
                        b._onClick = h;
                        return b;
                      }),
                      _onClick: null,
                    };
                    btnCb(b);
                    (api as any)._extra = b;
                    return {
                      ...b,
                      settingEl: document.createElement('div'),
                      infoEl: { remove: jest.fn() },
                    } as any;
                  }),
                };
              }),
            };
          }),
          settingEl: document.createElement('div'),
          infoEl: { remove: jest.fn() },
        };
        return api;
      });

      mockPlugin.settings.settings.rules = [{ criteria: 'a', path: '/a' }];
      rulesSettingsSection = new RulesSettingsSection(
        mockPlugin,
        mockContainerEl,
        mockRefreshDisplay
      );
      (rulesSettingsSection as any).addDragHandle = jest.fn();
      rulesSettingsSection.addRulesArray();

      const lastSettingInstance: any = (
        require('obsidian').Setting as any
      ).mock.results.pop().value;
      await lastSettingInstance._extra._onClick();

      expect(mockPlugin.save_settings).toHaveBeenCalled();
      expect(mockPlugin.noteMover.updateRuleManager).toHaveBeenCalled();
      expect(mockRefreshDisplay).toHaveBeenCalled();
      expect(mockPlugin.settings.settings.rules.length).toBe(0);

      (Setting as jest.Mock).mockImplementation(originalImpl as any);
    });

    it('should wire DragDropManager onReorder and onSave', async () => {
      const { DragDropManager } = require('../../../utils/DragDropManager');
      (rulesSettingsSection as any).addDragHandle = jest.fn();
      rulesSettingsSection.addRulesArray();
      const calls = (DragDropManager as jest.Mock).mock.calls;
      const options = calls[calls.length - 1][1];

      mockPlugin.settings.settings.rules = [
        { criteria: 'a', path: '/a' },
        { criteria: 'b', path: '/b' },
      ];
      options.onReorder(0, 1);
      expect(mockPlugin.settings.settings.rules[0].criteria).toBe('b');

      await options.onSave();
      expect(mockPlugin.save_settings).toHaveBeenCalled();
      expect(mockPlugin.noteMover.updateRuleManager).toHaveBeenCalled();
      expect(mockRefreshDisplay).toHaveBeenCalled();
    });
  });

  describe('addRulesSetting actions', () => {
    it('should add new rule via button click', async () => {
      const { Setting } = require('obsidian');
      const originalImpl = (Setting as jest.Mock).getMockImplementation();
      (Setting as jest.Mock).mockImplementation(() => {
        const api: any = {
          setName: jest.fn().mockReturnThis(),
          setHeading: jest.fn().mockReturnThis(),
          setDesc: jest.fn().mockReturnThis(),
          addButton: jest.fn().mockImplementation(cb => {
            const b: any = {
              setButtonText: jest.fn().mockReturnThis(),
              setCta: jest.fn().mockReturnThis(),
              onClick: jest.fn().mockImplementation(h => {
                b._onClick = h;
                return b;
              }),
              _onClick: null,
            };
            cb(b);
            (api as any)._btn = b;
            return b;
          }),
          addSearch: jest.fn().mockReturnThis(),
          settingEl: document.createElement('div'),
          infoEl: { remove: jest.fn() },
        };
        return api;
      });

      rulesSettingsSection = new RulesSettingsSection(
        mockPlugin,
        mockContainerEl,
        mockRefreshDisplay
      );
      rulesSettingsSection.addAddRuleButtonSetting();
      await (require('obsidian').Setting as any).mock.results
        .pop()
        .value._btn._onClick();

      expect(mockPlugin.settings.settings.rules.at(-1)).toEqual({
        criteria: '',
        path: '',
      });
      expect(mockPlugin.save_settings).toHaveBeenCalled();
      expect(mockPlugin.noteMover.updateRuleManager).toHaveBeenCalled();
      expect(mockRefreshDisplay).toHaveBeenCalled();

      (Setting as jest.Mock).mockImplementation(originalImpl as any);
    });
  });

  describe('moveRule', () => {
    it('should move rule up', () => {
      const originalRules = [...mockPlugin.settings.settings.rules];
      rulesSettingsSection.moveRule(1, -1);

      expect(mockPlugin.settings.settings.rules[0]).toBe(originalRules[1]);
      expect(mockPlugin.settings.settings.rules[1]).toBe(originalRules[0]);
    });

    it('should move rule down', () => {
      const originalRules = [...mockPlugin.settings.settings.rules];
      rulesSettingsSection.moveRule(0, 1);

      expect(mockPlugin.settings.settings.rules[0]).toBe(originalRules[1]);
      expect(mockPlugin.settings.settings.rules[1]).toBe(originalRules[0]);
    });

    it('should not move rule beyond boundaries', () => {
      const originalRules = [...mockPlugin.settings.settings.rules];
      rulesSettingsSection.moveRule(0, -1);

      expect(mockPlugin.settings.settings.rules).toEqual(originalRules);
    });

    it('should not move rule beyond upper boundary', () => {
      const originalRules = [...mockPlugin.settings.settings.rules];
      rulesSettingsSection.moveRule(1, 1);

      expect(mockPlugin.settings.settings.rules).toEqual(originalRules);
    });
  });

  describe('private methods', () => {
    it('should handle reorderRules correctly', () => {
      // Test reorderRules method through moveRule
      const originalRules = [...mockPlugin.settings.settings.rules];
      rulesSettingsSection.moveRule(1, -1);

      expect(mockPlugin.settings.settings.rules[0]).toBe(originalRules[1]);
      expect(mockPlugin.settings.settings.rules[1]).toBe(originalRules[0]);
    });

    it('should handle reorderRules with same index', () => {
      const originalRules = [...mockPlugin.settings.settings.rules];
      rulesSettingsSection.moveRule(0, 0);

      expect(mockPlugin.settings.settings.rules).toEqual(originalRules);
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
      mockPlugin.settings.settings.rules = [
        { criteria: 'tag: #work', path: '/work' },
        { criteria: 'fileName: notes.md', path: '/notes' },
        { criteria: 'content: important', path: '/important' },
      ];
      const originalRules = [...mockPlugin.settings.settings.rules];

      // Test reorderRules through moveRule
      rulesSettingsSection.moveRule(0, 2);

      expect(mockPlugin.settings.settings.rules[0]).toBe(originalRules[2]);
      expect(mockPlugin.settings.settings.rules[2]).toBe(originalRules[0]);
    });

    it('should not reorder when fromIndex equals toIndex', () => {
      mockPlugin.settings.settings.rules = [
        { criteria: 'tag: #work', path: '/work' },
        { criteria: 'fileName: notes.md', path: '/notes' },
      ];
      const originalRules = [...mockPlugin.settings.settings.rules];

      // Test through moveRule with same index
      rulesSettingsSection.moveRule(0, 0);

      expect(mockPlugin.settings.settings.rules).toEqual(originalRules);
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
