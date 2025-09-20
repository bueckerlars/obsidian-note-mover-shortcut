// Simplified error handling utilities
// Credits go to SilentVoid13 Templater Plugin: https://github.com/SilentVoid13/Templater

import { NoticeManager } from "./NoticeManager";

/**
 * Creates a standardized error with context information
 * @param message - The error message
 * @param context - Additional context about where the error occurred
 * @returns A new Error instance with enhanced message
 */
export function createError(message: string, context?: string): Error {
    const fullMessage = context ? `${context}: ${message}` : message;
    const error = new Error(fullMessage);
    return error;
}

/**
 * Handles errors consistently by logging them and optionally re-throwing
 * @param error - The error to handle
 * @param context - Additional context about where the error occurred
 * @param shouldThrow - Whether to re-throw the error after logging
 */
export function handleError(error: unknown, context?: string, shouldThrow: boolean = true): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
    
    NoticeManager.error(fullMessage);
    
    if (shouldThrow) {
        throw error instanceof Error ? error : new Error(errorMessage);
    }
}