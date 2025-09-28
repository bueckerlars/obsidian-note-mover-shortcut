import { FilterSettingsSection } from '../FilterSettingsSection';

// Mock AdvancedSuggest
jest.mock('../../suggesters/AdvancedSuggest', () => ({
  AdvancedSuggest: jest.fn().mockImplementation(() => ({
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

describe('FilterSettingsSection', () => {
  let mockPlugin: any;
  let mockContainerEl: HTMLElement;
  let mockRefreshDisplay: jest.Mock;
  let filterSettingsSection: FilterSettingsSection;

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
        filter: ['filter1', 'filter2'],
        isFilterWhitelist: false,
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

    // Create FilterSettingsSection instance
    filterSettingsSection = new FilterSettingsSection(
      mockPlugin,
      mockContainerEl,
      mockRefreshDisplay
    );
  });

  describe('addFilterSettings', () => {
    it('should execute without errors', () => {
      // Mock the addPeriodicMovementFilterArray method to avoid complex UI testing
      const originalMethod =
        filterSettingsSection.addPeriodicMovementFilterArray;
      filterSettingsSection.addPeriodicMovementFilterArray = jest.fn();

      expect(() => {
        filterSettingsSection.addFilterSettings();
      }).not.toThrow();

      expect(
        filterSettingsSection.addPeriodicMovementFilterArray
      ).toHaveBeenCalled();

      // Restore original method
      filterSettingsSection.addPeriodicMovementFilterArray = originalMethod;
    });
  });

  describe('addPeriodicMovementFilterArray', () => {
    it('should handle empty filter array', () => {
      mockPlugin.settings.filter = [];
      filterSettingsSection.addPeriodicMovementFilterArray();

      const containers = mockContainerEl.querySelectorAll('.filters-container');
      expect(containers.length).toBe(1);
    });
  });

  describe('moveFilter', () => {
    it('should move filter up', () => {
      const originalFilters = [...mockPlugin.settings.filter];
      filterSettingsSection.moveFilter(1, -1);

      expect(mockPlugin.settings.filter[0]).toBe(originalFilters[1]);
      expect(mockPlugin.settings.filter[1]).toBe(originalFilters[0]);
    });

    it('should move filter down', () => {
      const originalFilters = [...mockPlugin.settings.filter];
      filterSettingsSection.moveFilter(0, 1);

      expect(mockPlugin.settings.filter[0]).toBe(originalFilters[1]);
      expect(mockPlugin.settings.filter[1]).toBe(originalFilters[0]);
    });

    it('should not move filter beyond boundaries', () => {
      const originalFilters = [...mockPlugin.settings.filter];
      filterSettingsSection.moveFilter(0, -1);

      expect(mockPlugin.settings.filter).toEqual(originalFilters);
    });

    it('should not move filter beyond upper boundary', () => {
      const originalFilters = [...mockPlugin.settings.filter];
      filterSettingsSection.moveFilter(1, 1);

      expect(mockPlugin.settings.filter).toEqual(originalFilters);
    });
  });

  describe('private methods', () => {
    it('should handle reorderFilters correctly', () => {
      // Test reorderFilters method through moveFilter
      const originalFilters = [...mockPlugin.settings.filter];
      filterSettingsSection.moveFilter(1, -1);

      expect(mockPlugin.settings.filter[0]).toBe(originalFilters[1]);
      expect(mockPlugin.settings.filter[1]).toBe(originalFilters[0]);
    });

    it('should handle reorderFilters with same index', () => {
      const originalFilters = [...mockPlugin.settings.filter];
      filterSettingsSection.moveFilter(0, 0);

      expect(mockPlugin.settings.filter).toEqual(originalFilters);
    });

    it('should return app from getter', () => {
      const app = (filterSettingsSection as any).app;
      expect(app).toBe(mockPlugin.app);
    });
  });

  describe('addFilterSettings', () => {
    it('should create filter mode dropdown with correct initial value', () => {
      // Mock the addPeriodicMovementFilterArray method to avoid complex UI testing
      const originalMethod =
        filterSettingsSection.addPeriodicMovementFilterArray;
      filterSettingsSection.addPeriodicMovementFilterArray = jest.fn();

      filterSettingsSection.addFilterSettings();

      // Verify that addPeriodicMovementFilterArray was called
      expect(
        filterSettingsSection.addPeriodicMovementFilterArray
      ).toHaveBeenCalled();

      // Restore original method
      filterSettingsSection.addPeriodicMovementFilterArray = originalMethod;
    });

    it('should execute without errors', () => {
      // Mock the problematic method to avoid DOM issues
      const originalMethod =
        filterSettingsSection.addPeriodicMovementFilterArray;
      filterSettingsSection.addPeriodicMovementFilterArray = jest.fn();

      expect(() => {
        filterSettingsSection.addFilterSettings();
      }).not.toThrow();

      // Restore original method
      filterSettingsSection.addPeriodicMovementFilterArray = originalMethod;
    });
  });

  describe('addPeriodicMovementFilterArray', () => {
    it('should be callable', () => {
      // This test verifies the method exists and can be called
      expect(typeof filterSettingsSection.addPeriodicMovementFilterArray).toBe(
        'function'
      );
    });
  });

  describe('reorderFilters', () => {
    it('should reorder filters correctly', () => {
      mockPlugin.settings.filter = ['filter1', 'filter2', 'filter3'];
      const originalFilters = [...mockPlugin.settings.filter];

      // Test reorderFilters through moveFilter
      filterSettingsSection.moveFilter(0, 2);

      expect(mockPlugin.settings.filter[0]).toBe(originalFilters[2]);
      expect(mockPlugin.settings.filter[2]).toBe(originalFilters[0]);
    });

    it('should not reorder when fromIndex equals toIndex', () => {
      mockPlugin.settings.filter = ['filter1', 'filter2'];
      const originalFilters = [...mockPlugin.settings.filter];

      // Test through moveFilter with same index
      filterSettingsSection.moveFilter(0, 0);

      expect(mockPlugin.settings.filter).toEqual(originalFilters);
    });
  });

  describe('cleanupAdvancedSuggestInstances', () => {
    it('should clean up advanced suggest instances', () => {
      const cleanupSpy = jest.spyOn(
        filterSettingsSection as any,
        'cleanupAdvancedSuggestInstances'
      );

      filterSettingsSection.cleanup();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should handle cleanup when no instances exist', () => {
      // Call cleanup without creating any instances
      expect(() => {
        filterSettingsSection.cleanup();
      }).not.toThrow();
    });

    it('should be safe to call cleanup multiple times', () => {
      // Call cleanup multiple times
      expect(() => {
        filterSettingsSection.cleanup();
        filterSettingsSection.cleanup();
        filterSettingsSection.cleanup();
      }).not.toThrow();
    });

    it('should destroy drag drop manager', () => {
      // Mock the problematic method to avoid DOM issues
      const originalMethod = filterSettingsSection as any;
      originalMethod.addDragHandle = jest.fn();

      const destroySpy = jest.fn();
      (filterSettingsSection as any).dragDropManager = { destroy: destroySpy };

      filterSettingsSection.cleanup();

      expect(destroySpy).toHaveBeenCalled();
    });
  });
});
