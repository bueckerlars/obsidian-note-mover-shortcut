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
        it('sollte eine NoteMoverError mit Nachricht erstellen', () => {
            const error = new NoteMoverError('Test Error');
            expect(error.message).toBe('Test Error');
            expect(error.name).toBe('NoteMoverError');
        });

        it('sollte eine NoteMoverError mit Nachricht und Console-Message erstellen', () => {
            const error = new NoteMoverError('Test Error', 'Console Message');
            expect(error.message).toBe('Test Error');
            expect(error.console_msg).toBe('Console Message');
        });

        it('sollte eine NoteMoverError mit leerer Nachricht erstellen', () => {
            const error = new NoteMoverError('');
            expect(error.message).toBe('');
            expect(error.name).toBe('NoteMoverError');
        });

        it('sollte eine NoteMoverError mit undefined Console-Message erstellen', () => {
            const error = new NoteMoverError('Test Error', undefined);
            expect(error.message).toBe('Test Error');
            expect(error.console_msg).toBeUndefined();
        });
    });

    describe('errorWrapper', () => {
        it('sollte erfolgreiche Funktionen ausführen', async () => {
            const fn = jest.fn().mockResolvedValue('success');
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalled();
            expect(log_error).not.toHaveBeenCalled();
        });

        it('sollte NoteMoverError korrekt behandeln', async () => {
            const error = new NoteMoverError('Test Error');
            const fn = jest.fn().mockRejectedValue(error);
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBeNull();
            expect(log_error).toHaveBeenCalledWith(error);
        });

        it('sollte andere Fehler in NoteMoverError umwandeln', async () => {
            const error = new Error('Original Error');
            const fn = jest.fn().mockRejectedValue(error);
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBeNull();
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError).toBeInstanceOf(NoteMoverError);
            expect(loggedError.message).toBe('Error Message');
            expect(loggedError.console_msg).toBe('Original Error');
        });

        it('sollte mit undefined Fehlermeldung umgehen', async () => {
            const error = new Error();
            const fn = jest.fn().mockRejectedValue(error);
            const result = await errorWrapper(fn, 'Error Message');
            expect(result).toBeNull();
            const loggedError = (log_error as jest.Mock).mock.calls[0][0];
            expect(loggedError).toBeInstanceOf(NoteMoverError);
            expect(loggedError.message).toBe('Error Message');
            expect(loggedError.console_msg).toBe("");
        });

        it('sollte mit nicht-Error Objekten umgehen', async () => {
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
        it('sollte erfolgreiche synchrone Funktionen ausführen', () => {
            const fn = jest.fn().mockReturnValue('success');
            const result = errorWrapperSync(fn, 'Error Message');
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalled();
            expect(log_error).not.toHaveBeenCalled();
        });

        it('sollte Fehler in synchrone Funktionen abfangen', () => {
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

        it('sollte mit undefined Fehlermeldung umgehen', () => {
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

        it('sollte mit nicht-Error Objekten umgehen', () => {
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