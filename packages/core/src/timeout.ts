// src/timeout.ts
// Utility for running functions with timeout

export class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * Execute a function with a timeout
 * @param fn The function to execute (can be async)
 * @param timeout Timeout in milliseconds
 * @param name Optional name for error message
 * @returns Promise that resolves with function result or rejects on timeout
 */
export async function withTimeout<T>(
    fn: () => T | Promise<T>,
    timeout: number,
    name: string = 'Operation'
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let completed = false;

        // Set up timeout
        const timeoutId = setTimeout(() => {
            if (!completed) {
                completed = true;
                reject(new TimeoutError(`${name} exceeded timeout of ${timeout}ms`));
            }
        }, timeout);

        // Execute the function
        const executeAsync = async () => {
            try {
                const result = await fn();
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            } catch (error) {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            }
        };

        executeAsync();
    });
}

/**
 * Execute a function with an optional timeout
 * If no timeout is provided, executes normally
 */
export async function maybeWithTimeout<T>(
    fn: () => T | Promise<T>,
    timeout?: number,
    name?: string
): Promise<T> {
    if (timeout && timeout > 0) {
        return withTimeout(fn, timeout, name);
    }
    return fn();
}
