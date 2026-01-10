/**
 * Test Log Collector - Captures console logs during test execution
 *
 * Provides log interception and collection capabilities for enhanced error reporting.
 * Captures console.log, console.warn, and console.error outputs with timestamps.
 */

export interface LogEntry {
    message: string;
    timestamp: number;
}

export interface TestLogs {
    console: LogEntry[];      // Console.log/warn/error during test
    framework: LogEntry[];    // Test framework internal logs
    game: LogEntry[];        // Game-specific events/logs
}

export interface LogEntryWithType extends LogEntry {
    type: 'console' | 'framework' | 'game';
}

export interface ConsoleInterceptor {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
}

/**
 * Collects logs during test execution for enhanced error reporting
 */
export class TestLogCollector {
    private logs: TestLogs = {
        console: [],
        framework: [],
        game: []
    };

    private allLogs: LogEntryWithType[] = []; // Master list of all logs in chronological order
    private originalConsole: ConsoleInterceptor | null = null;
    private isCollecting = false;

    /**
     * Start collecting logs for the current test
     */
    startTest(): void {
        if (this.isCollecting) {
            this.cleanup(); // Cleanup any previous collection
        }

        this.logs = {
            console: [],
            framework: [],
            game: []
        };
        this.allLogs = [];

        this.interceptConsole();
        this.isCollecting = true;
    }

    /**
     * Stop collecting logs and restore original console methods
     */
    endTest(): void {
        if (this.isCollecting) {
            this.cleanup();
        }
    }

    /**
     * Intercept console methods to capture log output
     */
    private interceptConsole(): void {
        // Store original methods
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error
        };

        // Replace with intercepting versions
        console.log = (...args: any[]) => {
            this.addLog('console', this.formatLogArgs(args));
            this.originalConsole!.log.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            this.addLog('console', `WARN: ${this.formatLogArgs(args)}`);
            this.originalConsole!.warn.apply(console, args);
        };

        console.error = (...args: any[]) => {
            this.addLog('console', `ERROR: ${this.formatLogArgs(args)}`);
            this.originalConsole!.error.apply(console, args);
        };
    }

    /**
     * Format console arguments into a readable string
     */
    private formatLogArgs(args: any[]): string {
        return args.map(arg => {
            if (typeof arg === 'string') {
                return arg;
            } else if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return '[Object]';
                }
            } else {
                return String(arg);
            }
        }).join(' ');
    }

    /**
     * Add a log entry with timestamp
     */
    private addLog(type: keyof TestLogs, message: string): void {
        const timestamp = Date.now();
        const entry: LogEntry = { message, timestamp };
        this.logs[type].push(entry);
        this.allLogs.push({
            message,
            timestamp,
            type: type as 'console' | 'framework' | 'game'
        });
    }

    /**
     * Add a framework-specific log entry
     */
    addFrameworkLog(message: string): void {
        if (this.isCollecting) {
            this.addLog('framework', message);
        }
    }

    /**
     * Add a game-specific log entry
     */
    addGameLog(message: string): void {
        if (this.isCollecting) {
            this.addLog('game', message);
        }
    }

    /**
     * Get a copy of all collected logs
     */
    getLogs(): TestLogs {
        return {
            console: [...this.logs.console],
            framework: [...this.logs.framework],
            game: [...this.logs.game]
        };
    }

    /**
     * Get the number of logs collected
     */
    getLogCount(): number {
        return this.logs.console.length + this.logs.framework.length + this.logs.game.length;
    }

    /**
     * Check if any logs have been collected
     */
    hasLogs(): boolean {
        return this.getLogCount() > 0;
    }

    /**
     * Get recent logs (last N entries)
     */
    getRecentLogs(count: number = 10): { message: string; timestamp: number; type: string }[] {
        // Return logs in chronological order, taking the last N entries
        return this.allLogs
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-count);
    }

    /**
     * Clear all collected logs
     */
    clearLogs(): void {
        this.logs = {
            console: [],
            framework: [],
            game: []
        };
        this.allLogs = [];
    }

    /**
     * Restore original console methods and clean up
     */
    cleanup(): void {
        if (this.originalConsole) {
            console.log = this.originalConsole.log;
            console.warn = this.originalConsole.warn;
            console.error = this.originalConsole.error;
            this.originalConsole = null;
        }
        this.isCollecting = false;
    }
}

/**
 * Global log collector instance for framework use
 */
let globalLogCollector: TestLogCollector | null = null;

/**
 * Get the current test log collector
 */
export function getCurrentTestLogCollector(): TestLogCollector | null {
    return globalLogCollector;
}

/**
 * Set the global log collector (used by test runner)
 */
export function setGlobalLogCollector(collector: TestLogCollector | null): void {
    globalLogCollector = collector;
}

/**
 * Helper for game-specific logging in tests
 */
export const testLogger = {
    /**
     * Log a game event for test context
     */
    logGameEvent(event: string, data?: any): void {
        const collector = getCurrentTestLogCollector();
        if (collector) {
            const message = data
                ? `GAME_EVENT: ${event} ${JSON.stringify(data)}`
                : `GAME_EVENT: ${event}`;
            collector.addGameLog(message);
        }
    },

    /**
     * Log a scene change event
     */
    logSceneChange(fromScene: string, toScene: string): void {
        this.logGameEvent('scene_change', { from: fromScene, to: toScene });
    },

    /**
     * Log a player action
     */
    logPlayerAction(action: string, position?: { x: number; y: number }): void {
        this.logGameEvent('player_action', { action, position });
    },

    /**
     * Log a general test milestone
     */
    logTestMilestone(milestone: string, data?: any): void {
        const collector = getCurrentTestLogCollector();
        if (collector) {
            const message = data
                ? `TEST_MILESTONE: ${milestone} ${JSON.stringify(data)}`
                : `TEST_MILESTONE: ${milestone}`;
            collector.addFrameworkLog(message);
        }
    }
};
