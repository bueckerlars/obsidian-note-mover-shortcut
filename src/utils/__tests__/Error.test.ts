import { createError, handleError } from '../Error';
import { NoticeManager } from '../NoticeManager';

// Mock für die NoticeManager Funktion
jest.mock('../NoticeManager', () => ({
    NoticeManager: {
        error: jest.fn()
    }
}));

describe('Error', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createError', () => {
        it('should create an error with message only', () => {
            const error = createError('Test Error');
            expect(error.message).toBe('Test Error');
            expect(error).toBeInstanceOf(Error);
        });

        it('should create an error with message and context', () => {
            const error = createError('Test Error', 'Test Context');
            expect(error.message).toBe('Test Context: Test Error');
            expect(error).toBeInstanceOf(Error);
        });

        it('should create an error with empty message', () => {
            const error = createError('');
            expect(error.message).toBe('');
            expect(error).toBeInstanceOf(Error);
        });

        it('should create an error with undefined context', () => {
            const error = createError('Test Error', undefined);
            expect(error.message).toBe('Test Error');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('handleError', () => {
        it('should log and re-throw error by default', () => {
            const error = new Error('Test Error');
            expect(() => handleError(error, 'Test Context')).toThrow('Test Error');
            expect(NoticeManager.error).toHaveBeenCalledWith('Test Context: Test Error');
        });

        it('should log but not re-throw when shouldThrow is false', () => {
            const error = new Error('Test Error');
            expect(() => handleError(error, 'Test Context', false)).not.toThrow();
            expect(NoticeManager.error).toHaveBeenCalledWith('Test Context: Test Error');
        });

        it('should handle non-Error objects', () => {
            const error = { custom: 'error' };
            expect(() => handleError(error, 'Test Context')).toThrow('custom');
            expect(NoticeManager.error).toHaveBeenCalledWith('Test Context: custom');
        });

        it('should handle string errors', () => {
            const error = 'String error';
            expect(() => handleError(error, 'Test Context')).toThrow('String error');
            expect(NoticeManager.error).toHaveBeenCalledWith('Test Context: String error');
        });

        it('should handle undefined errors', () => {
            const error = undefined;
            expect(() => handleError(error, 'Test Context')).toThrow('undefined');
            expect(NoticeManager.error).toHaveBeenCalledWith('Test Context: undefined');
        });

        it('should create proper error message with context', () => {
            const error = new Error('Original Error');
            expect(() => handleError(error, 'Test Context')).toThrow('Original Error');
            expect(NoticeManager.error).toHaveBeenCalledWith('Test Context: Original Error');
        });
    });
}); 