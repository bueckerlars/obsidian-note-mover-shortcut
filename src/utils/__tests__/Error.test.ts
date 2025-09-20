import { createError, handleError } from '../Error';
import { log_error } from '../Log';

// Mock für die log_error Funktion
jest.mock('../Log', () => ({
    log_error: jest.fn()
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
            expect(log_error).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should log but not re-throw when shouldThrow is false', () => {
            const error = new Error('Test Error');
            expect(() => handleError(error, 'Test Context', false)).not.toThrow();
            expect(log_error).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should handle non-Error objects', () => {
            const error = { custom: 'error' };
            expect(() => handleError(error, 'Test Context')).toThrow('custom');
            expect(log_error).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should handle string errors', () => {
            const error = 'String error';
            expect(() => handleError(error, 'Test Context')).toThrow('String error');
            expect(log_error).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should handle undefined errors', () => {
            const error = undefined;
            expect(() => handleError(error, 'Test Context')).toThrow('undefined');
            expect(log_error).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should create proper error message with context', () => {
            const error = new Error('Original Error');
            expect(() => handleError(error, 'Test Context')).toThrow('Original Error');
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError.message).toBe('Test Context: Original Error');
        });
    });
}); 