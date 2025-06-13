import { log_update, log_info, log_error } from '../Log';
import { Notice } from 'obsidian';

// Mock für die Obsidian Notice-Klasse
jest.mock('obsidian', () => ({
    Notice: jest.fn().mockImplementation(() => ({
        noticeEl: document.createElement('div')
    }))
}));

describe('Log', () => {
    beforeEach(() => {
        // DOM-Elemente für Tests vorbereiten
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('log_update', () => {
        it('sollte eine Update-Benachrichtigung erstellen', () => {
            const message = 'Test Update Message';
            log_update(message);
            
            expect(Notice).toHaveBeenCalledWith('', 15000);
            const notice = (Notice as jest.Mock).mock.results[0].value;
            expect(notice.noticeEl.querySelector('b')?.textContent).toBe('NoteMover update:');
            expect(notice.noticeEl.querySelector('span')?.textContent).toBe(message);
        });
    });

    describe('log_info', () => {
        it('sollte eine Info-Benachrichtigung erstellen', () => {
            const message = 'Test Info Message';
            log_info(message);
            
            expect(Notice).toHaveBeenCalledWith('', 8000);
            const notice = (Notice as jest.Mock).mock.results[0].value;
            expect(notice.noticeEl.querySelector('b')?.textContent).toBe('NoteMover info:');
            expect(notice.noticeEl.querySelector('span')?.textContent).toBe(message);
        });
    });

    describe('log_error', () => {
        it('sollte eine Fehler-Benachrichtigung erstellen', () => {
            const error = new Error('Test Error Message');
            log_error(error);
            
            expect(Notice).toHaveBeenCalledWith('', 15000);
            const notice = (Notice as jest.Mock).mock.results[0].value;
            expect(notice.noticeEl.querySelector('b')?.textContent).toBe('NoteMover error:');
            expect(notice.noticeEl.querySelector('span')?.textContent).toBe(error.message);
        });
    });
}); 