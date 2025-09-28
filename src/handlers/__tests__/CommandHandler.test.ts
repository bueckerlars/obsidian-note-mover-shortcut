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
      },
      app: {},
      historyManager: {},
      updateManager: {
        showUpdateModal,
      },
    };
    handler = new CommandHandler(pluginMock);
  });

  it('registers all commands correctly', () => {
    handler.setup();
    expect(addCommand).toHaveBeenCalledTimes(6);
    const calls = addCommand.mock.calls;
    expect(calls[0][0].id).toBe('trigger-note-movement');
    expect(calls[1][0].id).toBe('trigger-note-bulk-move');
    expect(calls[2][0].id).toBe('show-history');
    expect(calls[3][0].id).toBe('show-update-modal');
    expect(calls[4][0].id).toBe('preview-bulk-movement');
    expect(calls[5][0].id).toBe('preview-note-movement');
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
      pluginMock.historyManager
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
});
