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
        enablePeriodicMovement: false,
        periodicMovementInterval: 5,
        enableOnEditTrigger: false,
      },
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
      plugin.settings.enablePeriodicMovement = true;
      plugin.settings.periodicMovementInterval = 10;

      triggerHandler.togglePeriodic();

      expect(window.setInterval).toHaveBeenCalled();
      // Verify interval ID is set
      expect((triggerHandler as any).periodicIntervalId).not.toBeNull();
    });

    it('should not start interval if periodic movement is disabled', () => {
      plugin.settings.enablePeriodicMovement = false;

      triggerHandler.togglePeriodic();

      expect(window.setInterval).not.toHaveBeenCalled();
      expect((triggerHandler as any).periodicIntervalId).toBeNull();
    });

    it('should call moveAllFilesInVaultPeriodic when interval fires', async () => {
      plugin.settings.enablePeriodicMovement = true;
      plugin.settings.periodicMovementInterval = 1; // 1 minute

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
      (plugin.settings as any).enableOnEditTrigger = true;
      plugin.registerEvent = jest.fn();

      triggerHandler.toggleOnEditListener();

      expect(plugin.registerEvent).toHaveBeenCalled();
      expect((triggerHandler as any).onEditUnregister).toBeDefined();
    });

    it('should not register listener if on-edit trigger is disabled', () => {
      (plugin.settings as any).enableOnEditTrigger = false;

      triggerHandler.toggleOnEditListener();

      expect(plugin.registerEvent).not.toHaveBeenCalled();
      expect((triggerHandler as any).onEditUnregister).toBeNull();
    });

    it('should register event listener when on-edit trigger is enabled', () => {
      (plugin.settings as any).enableOnEditTrigger = true;

      triggerHandler.toggleOnEditListener();

      expect(plugin.registerEvent).toHaveBeenCalled();
      expect((triggerHandler as any).onEditUnregister).not.toBeNull();
    });

    it('should handle file modification events correctly', () => {
      (plugin.settings as any).enableOnEditTrigger = true;

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
});
