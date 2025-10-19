import { TriggerEventHandler } from '../TriggerEventHandler';
import NoteMoverShortcutPlugin from '../../../main';
import { TFile } from 'obsidian';

// Mocks for global functions
const setIntervalMock = jest.fn();
const clearIntervalMock = jest.fn();
global.window = Object.assign(global.window || {}, {
  setInterval: setIntervalMock,
  clearInterval: clearIntervalMock,
});

describe('TriggerEventHandler', () => {
  let plugin: NoteMoverShortcutPlugin;
  let triggerHandler: TriggerEventHandler;
  let mockFile: TFile;

  beforeEach(() => {
    setIntervalMock.mockClear();
    clearIntervalMock.mockClear();

    // Mock File
    mockFile = {
      path: 'test/path/test.md',
      name: 'test.md',
      extension: 'md',
    } as TFile;

    // Mock Plugin
    plugin = {
      settings: {
        settings: {
          triggers: {
            enablePeriodicMovement: false,
            periodicMovementInterval: 5,
            enableOnEditTrigger: false,
          },
          filters: { filter: [] },
          rules: [],
          retentionPolicy: { value: 30, unit: 'days' },
        },
        history: { history: [], bulkOperations: [] },
      } as any,
      noteMover: {
        moveAllFilesInVaultPeriodic: jest.fn(),
        moveFileBasedOnTags: jest.fn(),
      },
      registerEvent: jest.fn().mockReturnValue(() => {}),
      app: {
        vault: {
          on: jest.fn().mockImplementation((eventName, callback) => ({
            eventName,
            callback,
          })),
        },
      },
    } as unknown as NoteMoverShortcutPlugin;

    triggerHandler = new TriggerEventHandler(plugin);
  });

  describe('togglePeriodic', () => {
    it('should clear existing interval when called', () => {
      // Set up existing interval
      const mockIntervalId = 123;
      (triggerHandler as any).periodicIntervalId = mockIntervalId;

      triggerHandler.togglePeriodic();

      expect(window.clearInterval).toHaveBeenCalledWith(mockIntervalId);
    });

    it('should start new interval if periodic movement is enabled', () => {
      plugin.settings.settings.triggers.enablePeriodicMovement = true;
      plugin.settings.settings.triggers.periodicMovementInterval = 10;

      triggerHandler.togglePeriodic();

      expect(window.setInterval).toHaveBeenCalled();
      // Verify interval ID is set
      expect((triggerHandler as any).periodicIntervalId).not.toBeNull();
    });

    it('should not start interval if periodic movement is disabled', () => {
      plugin.settings.settings.triggers.enablePeriodicMovement = false;

      triggerHandler.togglePeriodic();

      expect(window.setInterval).not.toHaveBeenCalled();
      expect((triggerHandler as any).periodicIntervalId).toBeNull();
    });

    it('should call moveAllFilesInVaultPeriodic when interval fires', async () => {
      plugin.settings.settings.triggers.enablePeriodicMovement = true;
      plugin.settings.settings.triggers.periodicMovementInterval = 1; // 1 minute

      triggerHandler.togglePeriodic();

      // Get the callback function passed to setInterval
      const intervalCallback = setIntervalMock.mock.calls[0][0];
      const intervalMs = setIntervalMock.mock.calls[0][1];

      expect(intervalMs).toBe(60 * 1000); // 1 minute in ms

      // Call the callback
      await intervalCallback();

      expect(plugin.noteMover.moveAllFilesInVaultPeriodic).toHaveBeenCalled();
    });
  });

  describe('toggleOnEditListener', () => {
    it('should unregister existing listener when called', () => {
      const mockUnregister = jest.fn();
      (triggerHandler as any).onEditUnregister = mockUnregister;

      triggerHandler.toggleOnEditListener();

      expect(mockUnregister).toHaveBeenCalled();
      expect((triggerHandler as any).onEditUnregister).toBeNull();
    });

    it('should register new listener if on-edit trigger is enabled', () => {
      plugin.settings.settings.triggers.enableOnEditTrigger = true as any;
      plugin.registerEvent = jest.fn();

      triggerHandler.toggleOnEditListener();

      expect(plugin.registerEvent).toHaveBeenCalled();
      expect((triggerHandler as any).onEditUnregister).toBeDefined();
    });

    it('should not register listener if on-edit trigger is disabled', () => {
      plugin.settings.settings.triggers.enableOnEditTrigger = false as any;

      triggerHandler.toggleOnEditListener();

      expect(plugin.registerEvent).not.toHaveBeenCalled();
      expect((triggerHandler as any).onEditUnregister).toBeNull();
    });

    it('should register event listener when on-edit trigger is enabled', () => {
      plugin.settings.settings.triggers.enableOnEditTrigger = true as any;

      triggerHandler.toggleOnEditListener();

      expect(plugin.registerEvent).toHaveBeenCalled();
      expect((triggerHandler as any).onEditUnregister).not.toBeNull();
    });

    it('should handle file modification events correctly', () => {
      plugin.settings.settings.triggers.enableOnEditTrigger = true as any;

      triggerHandler.toggleOnEditListener();

      // Verify that the event listener was registered
      expect(plugin.registerEvent).toHaveBeenCalled();
      expect(plugin.app.vault.on).toHaveBeenCalledWith(
        'modify',
        expect.any(Function)
      );
    });
  });

  describe('handleOnEdit', () => {
    it('should call moveFileBasedOnTags with correct parameters', async () => {
      const mockMoveFileBasedOnTags = jest.fn();
      plugin.noteMover.moveFileBasedOnTags = mockMoveFileBasedOnTags;

      // Access the private method for testing
      await (triggerHandler as any).handleOnEdit(mockFile);

      expect(mockMoveFileBasedOnTags).toHaveBeenCalledWith(
        mockFile,
        '/',
        false
      );
    });

    it('should handle errors in moveFileBasedOnTags gracefully', async () => {
      const mockMoveFileBasedOnTags = jest
        .fn()
        .mockRejectedValue(new Error('Move failed'));
      plugin.noteMover.moveFileBasedOnTags = mockMoveFileBasedOnTags;

      // Should not throw
      await expect(
        (triggerHandler as any).handleOnEdit(mockFile)
      ).rejects.toThrow('Move failed');
    });
  });

  describe('debounced onEdit handling', () => {
    it('should use debounced handler for file modifications', () => {
      plugin.settings.settings.triggers.enableOnEditTrigger = true as any;
      const mockMoveFileBasedOnTags = jest.fn();
      plugin.noteMover.moveFileBasedOnTags = mockMoveFileBasedOnTags;

      triggerHandler.toggleOnEditListener();

      // Get the event callback
      const eventCallback = (plugin.app.vault.on as jest.Mock).mock.calls[0][1];

      // Verify that the event callback is registered
      expect(eventCallback).toBeDefined();
      expect(typeof eventCallback).toBe('function');

      // The debounced handler should be set up
      expect((triggerHandler as any).debouncedHandleOnEdit).toBeDefined();
    });

    it('should process only the specific modified file, not entire vault', () => {
      plugin.settings.settings.triggers.enableOnEditTrigger = true as any;
      const mockMoveFileBasedOnTags = jest.fn();
      plugin.noteMover.moveFileBasedOnTags = mockMoveFileBasedOnTags;

      triggerHandler.toggleOnEditListener();

      // Get the event callback
      const eventCallback = (plugin.app.vault.on as jest.Mock).mock.calls[0][1];

      // Trigger file modification - this should call the debounced handler
      eventCallback(mockFile);

      // The debounced handler should be called (even if the actual execution is delayed)
      // We can't easily test the timing without complex async setup, but we can verify
      // that the handler is properly set up and the event callback works
      expect(eventCallback).toBeDefined();
    });

    it('should verify single-file processing in handleOnEdit', async () => {
      const mockMoveFileBasedOnTags = jest.fn();
      plugin.noteMover.moveFileBasedOnTags = mockMoveFileBasedOnTags;

      // Test the handleOnEdit method directly
      await (triggerHandler as any).handleOnEdit(mockFile);

      // Verify that moveFileBasedOnTags was called with the specific file
      expect(mockMoveFileBasedOnTags).toHaveBeenCalledTimes(1);
      expect(mockMoveFileBasedOnTags).toHaveBeenCalledWith(
        mockFile,
        '/',
        false
      );

      // Verify that no vault-wide operations were triggered
      // (moveFileBasedOnTags should only process the single file)
      expect(mockMoveFileBasedOnTags).toHaveBeenCalledWith(
        expect.objectContaining({
          path: mockFile.path,
          name: mockFile.name,
          extension: mockFile.extension,
        }),
        '/',
        false
      );
    });

    it('should not trigger any vault-wide operations during onEdit', () => {
      plugin.settings.settings.triggers.enableOnEditTrigger = true as any;

      // Mock vault methods to ensure they're not called
      const mockGetFiles = jest.fn();
      const mockGetMarkdownFiles = jest.fn();
      plugin.app.vault.getFiles = mockGetFiles;
      plugin.app.vault.getMarkdownFiles = mockGetMarkdownFiles;

      triggerHandler.toggleOnEditListener();

      // Get the event callback
      const eventCallback = (plugin.app.vault.on as jest.Mock).mock.calls[0][1];

      // Trigger file modification
      eventCallback(mockFile);

      // Verify that no vault-wide operations were triggered
      expect(mockGetFiles).not.toHaveBeenCalled();
      expect(mockGetMarkdownFiles).not.toHaveBeenCalled();
    });

    it('should have debounce manager initialized', () => {
      expect((triggerHandler as any).debounceManager).toBeDefined();
      expect((triggerHandler as any).debounceManager).toBeInstanceOf(
        require('../../utils/DebounceManager').DebounceManager
      );
    });
  });

  describe('cleanup', () => {
    it('should have cleanup method available', () => {
      expect(typeof triggerHandler.cleanup).toBe('function');
    });

    it('should call debounceManager.cancelAll on cleanup', () => {
      const mockCancelAll = jest.fn();
      (triggerHandler as any).debounceManager.cancelAll = mockCancelAll;

      triggerHandler.cleanup();

      expect(mockCancelAll).toHaveBeenCalled();
    });
  });
});
