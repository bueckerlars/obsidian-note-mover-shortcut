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
        it('should create an update notification', () => {
            const message = 'Test Update Message';
            log_update(message);
            
            expect(Notice).toHaveBeenCalledWith('', 15000);
            const notice = (Notice as jest.Mock).mock.results[0].value;
            expect(notice.noticeEl.querySelector('b')?.textContent).toBe('NoteMover update:');
            expect(notice.noticeEl.querySelector('span')?.textContent).toBe(message);
        });
    });

    describe('log_info', () => {
        it('should create an info notification', () => {
            const message = 'Test Info Message';
            log_info(message);
            
            expect(Notice).toHaveBeenCalledWith('', 8000);
            const notice = (Notice as jest.Mock).mock.results[0].value;
            expect(notice.noticeEl.querySelector('b')?.textContent).toBe('NoteMover info:');
            expect(notice.noticeEl.querySelector('span')?.textContent).toBe(message);
        });
    });

    describe('log_error', () => {
        it('should create an error notification', () => {
            const error = new Error('Test Error Message');
            log_error(error);
            
            expect(Notice).toHaveBeenCalledWith('', 15000);
            const notice = (Notice as jest.Mock).mock.results[0].value;
            expect(notice.noticeEl.querySelector('b')?.textContent).toBe('NoteMover error:');
            expect(notice.noticeEl.querySelector('span')?.textContent).toBe(error.message);
        });
    });
}); 