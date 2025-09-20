import { NoticeManager } from '../NoticeManager';
import { Notice } from 'obsidian';

// Mock für die Notice Klasse
jest.mock('obsidian', () => ({
    Notice: jest.fn().mockImplementation(() => ({
        noticeEl: {
            appendChild: jest.fn()
        }
    }))
}));

describe('NoticeManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('show', () => {
        it('should create a notice with default duration', () => {
            NoticeManager.show('info', 'Test message');
            expect(Notice).toHaveBeenCalledWith('', 8000);
        });

        it('should create a notice with custom duration', () => {
            NoticeManager.show('error', 'Test error', { duration: 10000 });
            expect(Notice).toHaveBeenCalledWith('', 10000);
        });

        it('should create a notice with undo button', () => {
            const onUndo = jest.fn();
            NoticeManager.show('info', 'Test message', { 
                showUndoButton: true, 
                onUndo,
                undoText: 'Custom Undo'
            });
            expect(Notice).toHaveBeenCalledWith('', 8000);
        });
    });

    describe('info', () => {
        it('should create an info notice', () => {
            NoticeManager.info('Test info message');
            expect(Notice).toHaveBeenCalledWith('', 8000);
        });
    });

    describe('error', () => {
        it('should create an error notice', () => {
            NoticeManager.error('Test error message');
            expect(Notice).toHaveBeenCalledWith('', 15000);
        });
    });

    describe('update', () => {
        it('should create an update notice', () => {
            NoticeManager.update('Test update message');
            expect(Notice).toHaveBeenCalledWith('', 15000);
        });
    });

    describe('success', () => {
        it('should create a success notice', () => {
            NoticeManager.success('Test success message');
            expect(Notice).toHaveBeenCalledWith('', 5000);
        });
    });

    describe('warning', () => {
        it('should create a warning notice', () => {
            NoticeManager.warning('Test warning message');
            expect(Notice).toHaveBeenCalledWith('', 10000);
        });
    });

    describe('showWithUndo', () => {
        it('should create a notice with undo functionality', () => {
            const onUndo = jest.fn();
            NoticeManager.showWithUndo('info', 'Test message', onUndo, 'Custom Undo');
            expect(Notice).toHaveBeenCalledWith('', 8000);
        });
    });
});
