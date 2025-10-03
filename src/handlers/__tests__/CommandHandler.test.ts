// Mock NoticeManager methods before imports
const errorSpy = jest.fn();
const warningSpy = jest.fn();

jest.mock('../../utils/NoticeManager', () => ({
  NoticeManager: {
    error: errorSpy,
    warning: warningSpy,
    info: jest.fn(),
    success: jest.fn(),
  },
  error: errorSpy,
  warning: warningSpy,
  info: jest.fn(),
  success: jest.fn(),
}));

import { CommandHandler } from '../CommandHandler';
import { NoticeManager } from '../../utils/NoticeManager';

const addCommand = jest.fn();
const moveFocusedNoteToDestination = jest.fn();
const moveAllFilesInVault = jest.fn();
const generateVaultMovePreview = jest.fn();
const generateActiveNotePreview = jest.fn();
const open = jest.fn();
const showUpdateModal = jest.fn();

jest.mock('../../modals/HistoryModal', () => {
  return {
    HistoryModal: jest.fn().mockImplementation(() => ({ open })),
  };
});

jest.mock('../../modals/PreviewModal', () => {
  return {
    PreviewModal: jest.fn().mockImplementation(() => ({ open })),
  };
});

describe('CommandHandler', () => {
  let pluginMock: any;
  let handler: CommandHandler;

  beforeEach(() => {
    addCommand.mockClear();
    moveFocusedNoteToDestination.mockClear();
    moveAllFilesInVault.mockClear();
    generateVaultMovePreview.mockClear();
    generateActiveNotePreview.mockClear();
    open.mockClear();
    showUpdateModal.mockClear();

    pluginMock = {
      addCommand,
      noteMover: {
        moveFocusedNoteToDestination,
        moveAllFilesInVault,
        generateVaultMovePreview,
        generateActiveNotePreview,
        updateRuleManager: jest.fn(),
        addFileToBlacklist: jest.fn(),
      },
      app: {},
      historyManager: {},
      updateManager: {
        showUpdateModal,
      },
      settings: { settings: {} },
      save_settings: jest.fn(),
    };
    handler = new CommandHandler(pluginMock);
  });

  it('registers all commands correctly', () => {
    handler.setup();
    expect(addCommand).toHaveBeenCalledTimes(7);
    const calls = addCommand.mock.calls;
    expect(calls[0][0].id).toBe('trigger-note-movement');
    expect(calls[1][0].id).toBe('trigger-note-bulk-move');
    expect(calls[2][0].id).toBe('show-history');
    expect(calls[3][0].id).toBe('show-update-modal');
    expect(calls[4][0].id).toBe('preview-bulk-movement');
    expect(calls[5][0].id).toBe('preview-note-movement');
    expect(calls[6][0].id).toBe('add-current-file-to-blacklist');
  });

  it('calls moveFocusedNoteToDestination in editor callback', () => {
    handler.setup();
    // Extract and execute editor callback from the first command
    const editorCallback = addCommand.mock.calls[0][0].editorCallback;
    editorCallback({}, {});
    expect(moveFocusedNoteToDestination).toHaveBeenCalled();
  });

  it('calls moveAllFilesInVault in bulk callback', () => {
    handler.setup();
    const callback = addCommand.mock.calls[1][0].callback;
    callback();
    expect(moveAllFilesInVault).toHaveBeenCalled();
  });

  it('opens HistoryModal in history callback', () => {
    handler.setup();
    const callback = addCommand.mock.calls[2][0].callback;
    callback();
    expect(open).toHaveBeenCalled();
  });

  it('calls showUpdateModal in update modal callback', () => {
    handler.setup();
    const callback = addCommand.mock.calls[3][0].callback;
    callback();
    expect(showUpdateModal).toHaveBeenCalledWith(true);
  });

  it('handles preview bulk movement callback with success', async () => {
    const mockPreview = { successfulMoves: [], blockedMoves: [] };
    generateVaultMovePreview.mockResolvedValue(mockPreview);

    handler.setup();
    const callback = addCommand.mock.calls[4][0].callback;
    await callback();

    expect(generateVaultMovePreview).toHaveBeenCalled();
    expect(open).toHaveBeenCalled();
  });

  it('handles preview note movement callback with success', async () => {
    const mockPreview = { successfulMoves: [], blockedMoves: [] };
    generateActiveNotePreview.mockResolvedValue(mockPreview);

    handler.setup();
    const editorCallback = addCommand.mock.calls[5][0].editorCallback;
    await editorCallback({}, {});

    expect(generateActiveNotePreview).toHaveBeenCalled();
    expect(open).toHaveBeenCalled();
  });

  it('handles preview bulk movement callback with error', async () => {
    const errorMessage = 'Preview generation failed';
    generateVaultMovePreview.mockRejectedValue(new Error(errorMessage));

    handler.setup();
    const callback = addCommand.mock.calls[4][0].callback;
    await callback();

    expect(generateVaultMovePreview).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error generating preview')
    );
  });

  it('handles preview note movement callback with error', async () => {
    const errorMessage = 'Preview generation failed';
    generateActiveNotePreview.mockRejectedValue(new Error(errorMessage));

    handler.setup();
    const editorCallback = addCommand.mock.calls[5][0].editorCallback;
    await editorCallback({}, {});

    expect(generateActiveNotePreview).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error generating preview')
    );
  });

  it('handles preview note movement callback when no preview is returned', async () => {
    generateActiveNotePreview.mockResolvedValue(null);

    handler.setup();
    const editorCallback = addCommand.mock.calls[5][0].editorCallback;
    await editorCallback({}, {});

    expect(generateActiveNotePreview).toHaveBeenCalled();
    expect(warningSpy).toHaveBeenCalledWith('No active note to preview.');
  });

  it('handles preview note movement callback with non-Error exception', async () => {
    const errorMessage = 'String error';
    generateActiveNotePreview.mockRejectedValue(errorMessage);

    handler.setup();
    const editorCallback = addCommand.mock.calls[5][0].editorCallback;
    await editorCallback({}, {});

    expect(generateActiveNotePreview).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error generating preview')
    );
  });

  it('handles preview bulk movement callback with non-Error exception', async () => {
    const errorMessage = 'String error';
    generateVaultMovePreview.mockRejectedValue(errorMessage);

    handler.setup();
    const callback = addCommand.mock.calls[4][0].callback;
    await callback();

    expect(generateVaultMovePreview).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error generating preview')
    );
  });

  it('creates HistoryModal with correct parameters', () => {
    const HistoryModal = require('../../modals/HistoryModal').HistoryModal;
    const mockHistoryModal = { open: jest.fn() };
    HistoryModal.mockImplementation(() => mockHistoryModal);

    handler.setup();
    const callback = addCommand.mock.calls[2][0].callback;
    callback();

    expect(HistoryModal).toHaveBeenCalledWith(
      pluginMock.app,
      pluginMock.historyManager,
      pluginMock
    );
    expect(mockHistoryModal.open).toHaveBeenCalled();
  });

  it('creates PreviewModal with correct parameters for bulk movement', async () => {
    const PreviewModal = require('../../modals/PreviewModal').PreviewModal;
    const mockPreviewModal = { open: jest.fn() };
    PreviewModal.mockImplementation(() => mockPreviewModal);
    const mockPreview = { successfulMoves: [], blockedMoves: [] };
    generateVaultMovePreview.mockResolvedValue(mockPreview);

    handler.setup();
    const callback = addCommand.mock.calls[4][0].callback;
    await callback();

    expect(PreviewModal).toHaveBeenCalledWith(
      pluginMock.app,
      pluginMock,
      mockPreview
    );
    expect(mockPreviewModal.open).toHaveBeenCalled();
  });

  it('creates PreviewModal with correct parameters for note movement', async () => {
    const PreviewModal = require('../../modals/PreviewModal').PreviewModal;
    const mockPreviewModal = { open: jest.fn() };
    PreviewModal.mockImplementation(() => mockPreviewModal);
    const mockPreview = { successfulMoves: [], blockedMoves: [] };
    generateActiveNotePreview.mockResolvedValue(mockPreview);

    handler.setup();
    const editorCallback = addCommand.mock.calls[5][0].editorCallback;
    await editorCallback({}, {});

    expect(PreviewModal).toHaveBeenCalledWith(
      pluginMock.app,
      pluginMock,
      mockPreview
    );
    expect(mockPreviewModal.open).toHaveBeenCalled();
  });

  describe('add-current-file-to-blacklist command', () => {
    it('adds current file to blacklist successfully', async () => {
      const mockFileName = 'test-file.md';
      const mockView = { file: { name: mockFileName } };
      const mockEditor = {};

      handler.setup();
      const editorCallback = addCommand.mock.calls[6][0].editorCallback;
      await editorCallback(mockEditor, mockView);

      expect(pluginMock.noteMover.addFileToBlacklist).toHaveBeenCalledWith(
        mockFileName
      );
    });

    it('shows warning when no file is active', async () => {
      const mockView = { file: null };
      const mockEditor = {};

      handler.setup();
      const editorCallback = addCommand.mock.calls[6][0].editorCallback;
      await editorCallback(mockEditor, mockView);

      expect(warningSpy).toHaveBeenCalledWith(
        'No active file to add to blacklist.'
      );
    });

    it('shows warning when file is already in blacklist', async () => {
      const mockFileName = 'test-file.md';
      const mockView = { file: { name: mockFileName } };
      const mockEditor = {};

      // Mock the addFileToBlacklist function to simulate already in blacklist
      pluginMock.noteMover.addFileToBlacklist.mockImplementation(
        async (fileName: string) => {
          NoticeManager.warning(
            `File "${fileName}" is already in the blacklist.`
          );
        }
      );

      handler.setup();
      const editorCallback = addCommand.mock.calls[6][0].editorCallback;
      await editorCallback(mockEditor, mockView);

      expect(pluginMock.noteMover.addFileToBlacklist).toHaveBeenCalledWith(
        mockFileName
      );
      expect(warningSpy).toHaveBeenCalledWith(
        `File "${mockFileName}" is already in the blacklist.`
      );
    });

    it('handles error when adding file to blacklist', async () => {
      const mockFileName = 'test-file.md';
      const mockView = { file: { name: mockFileName } };
      const mockEditor = {};
      const errorMessage = 'Save failed';

      // Mock the addFileToBlacklist function to throw an error
      pluginMock.noteMover.addFileToBlacklist.mockRejectedValue(
        new Error(errorMessage)
      );

      handler.setup();
      const editorCallback = addCommand.mock.calls[6][0].editorCallback;
      await editorCallback(mockEditor, mockView);

      expect(pluginMock.noteMover.addFileToBlacklist).toHaveBeenCalledWith(
        mockFileName
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error adding file to blacklist')
      );
    });
  });

  it('registers rescan-index when index cache is enabled and runs successfully', async () => {
    pluginMock.settings.settings = {
      indexing: { enableIndexCache: true, maxExcerptBytes: 0 },
    };
    pluginMock.indexOrchestrator = {
      ensureInitialized: jest.fn(),
      enqueueAllMarkdownFiles: jest.fn(),
      processAllDirty: jest.fn(),
    };
    handler = new CommandHandler(pluginMock);

    handler.setup();

    // rescan-index should be the 8th command now
    const rescanCall = addCommand.mock.calls.find(
      call => call[0].id === 'rescan-index'
    );
    expect(rescanCall).toBeDefined();
    await rescanCall[0].callback();
    expect(pluginMock.indexOrchestrator.ensureInitialized).toHaveBeenCalled();
    expect(
      pluginMock.indexOrchestrator.enqueueAllMarkdownFiles
    ).toHaveBeenCalled();
    expect(pluginMock.indexOrchestrator.processAllDirty).toHaveBeenCalledWith(
      false
    );
  });

  it('rescan-index uses content when maxExcerptBytes > 0 and handles errors', async () => {
    const errorSpyLocal = jest.spyOn(
      require('../../utils/NoticeManager').NoticeManager,
      'error'
    );
    pluginMock.settings.settings = {
      indexing: { enableIndexCache: true, maxExcerptBytes: 1024 },
    };
    const ensureInitialized = jest.fn();
    const enqueueAllMarkdownFiles = jest.fn();
    const processAllDirty = jest.fn().mockRejectedValue(new Error('Boom'));
    pluginMock.indexOrchestrator = {
      ensureInitialized,
      enqueueAllMarkdownFiles,
      processAllDirty,
    };
    handler = new CommandHandler(pluginMock);

    handler.setup();
    const rescanCall = addCommand.mock.calls.find(
      call => call[0].id === 'rescan-index'
    );
    expect(rescanCall).toBeDefined();
    await rescanCall[0].callback();
    expect(processAllDirty).toHaveBeenCalledWith(true);
    expect(errorSpyLocal).toHaveBeenCalled();
  });
});
