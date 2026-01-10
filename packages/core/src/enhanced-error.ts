/**
 * Enhanced Test Error - Provides rich error context for better debugging
 *
 * Extends standard Error with test execution context including logs,
 * timing information, and other debugging aids.
 */

import { TestErrorContext, SafeError } from './types';

export type TestContext = TestErrorContext;

/**
 * Enhanced error class that includes test execution context
 */
export class EnhancedTestError extends Error {
    public readonly context: TestContext;
    public readonly originalError?: Error;
    public readonly name: string;
    public readonly message: string;
    public file?: string;
    public line?: number;
    public column?: number;
    public stackArray?: string[]; // SafeError-compatible stack as string array

    constructor(
        message: string,
        context: TestContext,
        originalError?: Error,
        remappedLocation?: { file?: string; line?: number; column?: number; stack?: string[] }
    ) {
        super(message);
        this.message = message;
        this.context = context;
        this.originalError = originalError;
        // Preserve the original error's name, or use a sensible default
        this.name = originalError?.name || 'TestError';

        // Use remapped location if provided, otherwise parse from stack
        if (remappedLocation) {
            this.file = remappedLocation.file;
            this.line = remappedLocation.line;
            this.column = remappedLocation.column;
            this.stackArray = remappedLocation.stack || (originalError?.stack?.split('\n'));
        } else {
            // Parse stack trace from original error or create new one
            if (originalError && originalError.stack) {
                this.stackArray = originalError.stack.split('\n');
                // Try to extract file/line info from first stack frame
                this.parseStackInfo(originalError.stack);
            } else if (super.stack) {
                this.stackArray = super.stack.split('\n');
                this.parseStackInfo(super.stack);
            }
        }

        // Maintain proper stack trace for Error compatibility
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, EnhancedTestError);
        }
    }

    /**
     * Parse file, line, column info from stack trace
     */
    private parseStackInfo(stackString: string): void {
        // Look for patterns like "at file:line:column" or "(file:line:column)"
        const stackMatch = stackString.match(/\(?([^:)]+):(\d+):(\d+)\)?/);
        if (stackMatch) {
            this.file = stackMatch[1];
            this.line = parseInt(stackMatch[2], 10);
            this.column = parseInt(stackMatch[3], 10);
        }
    }


    /**
     * Generate a comprehensive error report with context
     */
    toString(): string {
        const { logs, timing, testPath, metadata } = this.context;
        const parts: string[] = [];

        // Main error message
        parts.push(`${this.name}: ${this.message}`);
        parts.push('');

        // Test information
        if (testPath) {
            parts.push('=== Test Information ===');
            parts.push(`Suite: ${testPath.suite}`);
            parts.push(`Test: ${testPath.test}`);
            if (testPath.file) {
                parts.push(`File: ${testPath.file}${testPath.line ? `:${testPath.line}` : ''}`);
            }
            if (metadata?.retryAttempt) {
                parts.push(`Retry Attempt: ${metadata.retryAttempt}/${metadata.totalAttempts || '?'}`);
            }
            if (metadata?.tags?.length) {
                parts.push(`Tags: ${metadata.tags.join(', ')}`);
            }
            parts.push('');
        }

        // Timing information
        if (timing) {
            parts.push('=== Timing Information ===');
            if (timing.duration !== undefined) {
                parts.push(`Test Duration: ${timing.duration}ms`);
            }
            if (timing.start) {
                parts.push(`Started: ${new Date(timing.start).toISOString()}`);
            }
            if (timing.end) {
                parts.push(`Ended: ${new Date(timing.end).toISOString()}`);
            }
            parts.push('');
        }

        // Recent logs (last 10)
        if (logs.console.length > 0 || logs.framework.length > 0 || logs.game.length > 0) {
            parts.push('=== Recent Logs (last 10) ===');
            const recentLogs = this.getRecentLogs(10);

            if (recentLogs.length === 0) {
                parts.push('No logs captured during test execution');
            } else {
                recentLogs.forEach(({ message, timestamp, type }) => {
                    const time = new Date(timestamp).toISOString().substr(11, 12); // HH:mm:ss.sss
                    parts.push(`[${time}] [${type.toUpperCase()}] ${message}`);
                });
            }
            parts.push('');
        }

        // Console logs summary
        if (logs.console.length > 0) {
            parts.push(`=== Console Logs (${logs.console.length} total) ===`);
            const displayLogs = logs.console.slice(-5); // Show last 5 console logs
            displayLogs.forEach((log) => {
                const time = new Date(log.timestamp).toISOString().substr(11, 12);
                parts.push(`[${time}] ${log.message}`);
            });
            if (logs.console.length > 5) {
                parts.push(`... and ${logs.console.length - 5} more console logs`);
            }
            parts.push('');
        }

        // Game logs
        if (logs.game.length > 0) {
            parts.push(`=== Game Events (${logs.game.length} total) ===`);
            const displayLogs = logs.game.slice(-3); // Show last 3 game events
            displayLogs.forEach((log) => {
                const time = new Date(log.timestamp).toISOString().substr(11, 12);
                parts.push(`[${time}] ${log.message}`);
            });
            if (logs.game.length > 3) {
                parts.push(`... and ${logs.game.length - 3} more game events`);
            }
            parts.push('');
        }

        // Framework logs
        if (logs.framework.length > 0) {
            parts.push(`=== Framework Logs (${logs.framework.length} total) ===`);
            const displayLogs = logs.framework.slice(-3); // Show last 3 framework logs
            displayLogs.forEach((log) => {
                const time = new Date(log.timestamp).toISOString().substr(11, 12);
                parts.push(`[${time}] ${log.message}`);
            });
            if (logs.framework.length > 3) {
                parts.push(`... and ${logs.framework.length - 3} more framework logs`);
            }
            parts.push('');
        }

        // Original error details
        if (this.originalError) {
            parts.push('=== Original Error ===');
            parts.push(`${this.originalError.name}: ${this.originalError.message}`);
            if (this.originalError.stack) {
                parts.push('');
                parts.push('Stack Trace:');
                parts.push(this.originalError.stack);
            }
            parts.push('');
        } else if (this.stackArray) {
            parts.push('=== Stack Trace ===');
            parts.push(this.stackArray.join('\n'));
            parts.push('');
        }

        // Additional metadata
        if (metadata) {
            const additionalData = { ...metadata };
            delete additionalData.retryAttempt;
            delete additionalData.totalAttempts;
            delete additionalData.tags;

            if (Object.keys(additionalData).length > 0) {
                parts.push('=== Additional Context ===');
                Object.entries(additionalData).forEach(([key, value]) => {
                    parts.push(`${key}: ${JSON.stringify(value)}`);
                });
                parts.push('');
            }
        }

        return parts.join('\n');
    }

    /**
     * Get recent logs from all sources, sorted by timestamp
     */
    private getRecentLogs(count: number): Array<{ message: string; timestamp: number; type: string }> {
        const allLogs: Array<{ message: string; timestamp: number; type: string }> = [];

        // Add console logs
        this.context.logs.console.forEach((log) => {
            allLogs.push({ message: log.message, timestamp: log.timestamp, type: 'console' });
        });

        // Add framework logs
        this.context.logs.framework.forEach((log) => {
            allLogs.push({ message: log.message, timestamp: log.timestamp, type: 'framework' });
        });

        // Add game logs
        this.context.logs.game.forEach((log) => {
            allLogs.push({ message: log.message, timestamp: log.timestamp, type: 'game' });
        });

        // Sort by timestamp and return most recent
        return allLogs
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-count);
    }

    /**
     * Get a compact summary of the error for reporting
     */
    getCompactSummary(): string {
        const { testPath, logs, timing } = this.context;
        const logCount = logs.console.length + logs.framework.length + logs.game.length;

        let summary = this.message;

        if (testPath) {
            summary += ` (${testPath.suite} > ${testPath.test})`;
        }

        if (timing?.duration) {
            summary += ` [${timing.duration}ms]`;
        }

        if (logCount > 0) {
            summary += ` [${logCount} logs]`;
        }

        return summary;
    }

    /**
     * Export context data as JSON
     */
    toJSON(): any {
        return {
            name: this.name,
            message: this.message,
            file: this.file,
            line: this.line,
            column: this.column,
            context: this.context,
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message,
                stack: this.originalError.stack
            } : undefined,
            stack: this.stackArray
        };
    }
}

/**
 * Create an enhanced error from a standard error with context
 */
export function createEnhancedError(
    error: Error,
    context: Partial<TestContext> = {}
): EnhancedTestError {
    const fullContext: TestContext = {
        logs: { console: [], framework: [], game: [] },
        ...context
    };

    return new EnhancedTestError(
        error.message,
        fullContext,
        error
    );
}

/**
 * Check if an error is an enhanced test error
 */
export function isEnhancedTestError(error: any): error is EnhancedTestError {
    return error instanceof EnhancedTestError;
}

/**
 * Convert an EnhancedTestError to SafeError format for the test runner
 */
export function toSafeError(error: EnhancedTestError): SafeError {
    return {
        name: error.name,
        message: error.message,
        file: error.file,
        line: error.line,
        column: error.column,
        stack: error.stackArray,
        context: error.context,
        originalError: error.originalError,
        toString: () => error.toString(),
        toJSON: () => error.toJSON(),
        getCompactSummary: () => error.getCompactSummary()
    };
}
