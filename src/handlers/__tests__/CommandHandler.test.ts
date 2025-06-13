import { CommandHandler } from '../CommandHandler';

const addCommand = jest.fn();
const moveFocusedNoteToDestination = jest.fn();
const moveNotesFromInboxToNotesFolder = jest.fn();
const open = jest.fn();

jest.mock('../../modals/HistoryModal', () => {
    return {
        HistoryModal: jest.fn().mockImplementation(() => ({ open })),
    };
});

describe('CommandHandler', () => {
    let pluginMock: any;
    let handler: CommandHandler;

    beforeEach(() => {
        addCommand.mockClear();
        moveFocusedNoteToDestination.mockClear();
        moveNotesFromInboxToNotesFolder.mockClear();
        open.mockClear();

        pluginMock = {
            addCommand,
            noteMover: {
                moveFocusedNoteToDestination,
                moveNotesFromInboxToNotesFolder,
            },
            app: {},
            historyManager: {},
        };
        handler = new CommandHandler(pluginMock);
    });

    it('registriert alle Kommandos korrekt', () => {
        handler.setup();
        expect(addCommand).toHaveBeenCalledTimes(3);
        const calls = addCommand.mock.calls;
        expect(calls[0][0].id).toBe('trigger-note-movement');
        expect(calls[1][0].id).toBe('trigger-note-bulk-move');
        expect(calls[2][0].id).toBe('show-history');
    });

    it('ruft moveFocusedNoteToDestination beim Editor-Callback auf', () => {
        handler.setup();
        // Editor-Callback aus dem ersten Kommando extrahieren und ausführen
        const editorCallback = addCommand.mock.calls[0][0].editorCallback;
        editorCallback({}, {});
        expect(moveFocusedNoteToDestination).toHaveBeenCalled();
    });

    it('ruft moveNotesFromInboxToNotesFolder beim Bulk-Callback auf', () => {
        handler.setup();
        const callback = addCommand.mock.calls[1][0].callback;
        callback();
        expect(moveNotesFromInboxToNotesFolder).toHaveBeenCalled();
    });

    it('öffnet das HistoryModal beim History-Callback', () => {
        handler.setup();
        const callback = addCommand.mock.calls[2][0].callback;
        callback();
        expect(open).toHaveBeenCalled();
    });
}); 