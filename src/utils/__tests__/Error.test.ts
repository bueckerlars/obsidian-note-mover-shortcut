import { NoteMoverError, errorWrapper, errorWrapperSync } from '../Error';
import { log_error } from '../Log';

// Mock für die log_error Funktion
jest.mock('../Log', () => ({
    log_error: jest.fn()
}));

describe('Error', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('NoteMoverError', () => {
        it('should create a NoteMoverError with message', () => {
            const error = new NoteMoverError('Test Error');
            expect(error.message).toBe('Test Error');
            expect(error.name).toBe('NoteMoverError');
        });

        it('should create a NoteMoverError with message and console message', () => {
            const error = new NoteMoverError('Test Error', 'Console Message');
            expect(error.message).toBe('Test Error');
            expect(error.console_msg).toBe('Console Message');
        });

        it('should create a NoteMoverError with empty message', () => {
            const error = new NoteMoverError('');
            expect(error.message).toBe('');
            expect(error.name).toBe('NoteMoverError');
        });

        it('should create a NoteMoverError with undefined console message', () => {
            const error = new NoteMoverError('Test Error', undefined);
            expect(error.message).toBe('Test Error');
            expect(error.console_msg).toBeUndefined();
        });
    });

    describe('errorWrapper', () => {
        it('should execute successful functions', async () => {
            const fn = jest.fn().mockResolvedValue('success');
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalled();
            expect(log_error).not.toHaveBeenCalled();
        });

        it('should handle NoteMoverError correctly', async () => {
            const error = new NoteMoverError('Test Error');
            const fn = jest.fn().mockRejectedValue(error);
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBeNull();
            expect(log_error).toHaveBeenCalledWith(error);
        });

        it('should convert other errors to NoteMoverError', async () => {
            const error = new Error('Original Error');
            const fn = jest.fn().mockRejectedValue(error);
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBeNull();
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError).toBeInstanceOf(NoteMoverError);
            expect(loggedError.message).toBe('Error Message');
            expect(loggedError.console_msg).toBe('Original Error');
        });

        it('should handle undefined error message', async () => {
            const error = new Error();
            const fn = jest.fn().mockRejectedValue(error);
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBeNull();
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError).toBeInstanceOf(NoteMoverError);
            expect(loggedError.message).toBe('Error Message');
            expect(loggedError.console_msg).toBe("");
        });

        it('should handle non-Error objects', async () => {
            const error = { custom: 'error' };
            const fn = jest.fn().mockRejectedValue(error);
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBeNull();
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError).toBeInstanceOf(NoteMoverError);
            expect(loggedError.message).toBe('Error Message');
            expect(loggedError.console_msg).toBeUndefined();
        });
    });

    describe('errorWrapperSync', () => {
        it('should execute successful synchronous functions', () => {
            const fn = jest.fn().mockReturnValue('success');
            const result = errorWrapperSync(fn, 'Error Message');
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalled();
            expect(log_error).not.toHaveBeenCalled();
        });

        it('should catch errors in synchronous functions', () => {
            const error = new Error('Original Error');
            const fn = jest.fn().mockImplementation(() => {
                throw error;
            });
            const result = errorWrapperSync(fn, 'Error Message');
            expect(result).toBeNull();
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError).toBeInstanceOf(NoteMoverError);
            expect(loggedError.message).toBe('Error Message');
            expect(loggedError.console_msg).toBe('Original Error');
        });

        it('should handle undefined error message', () => {
            const error = new Error();
            const fn = jest.fn().mockImplementation(() => {
                throw error;
            });
            const result = errorWrapperSync(fn, 'Error Message');
            expect(result).toBeNull();
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError).toBeInstanceOf(NoteMoverError);
            expect(loggedError.message).toBe('Error Message');
            expect(loggedError.console_msg).toBe("");
        });

        it('should handle non-Error objects', () => {
            const error = { custom: 'error' };
            const fn = jest.fn().mockImplementation(() => {
                throw error;
            });
            const result = errorWrapperSync(fn, 'Error Message');
            expect(result).toBeNull();
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError).toBeInstanceOf(NoteMoverError);
            expect(loggedError.message).toBe('Error Message');
            expect(loggedError.console_msg).toBeUndefined();
        });
    });
}); 