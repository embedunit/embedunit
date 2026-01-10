// src/config.ts
// Global configuration for the test framework

export interface TestConfig {
    defaultTimeout: number; // Default timeout in milliseconds
    suiteTimeout?: number; // Default timeout for describe blocks
    hookTimeout?: number; // Default timeout for hooks (beforeAll, etc.)
}

// Default configuration
let config: TestConfig = {
    defaultTimeout: 5000, // 5 seconds default
    suiteTimeout: undefined, // No suite timeout by default
    hookTimeout: 5000 // 5 seconds for hooks
};

/**
 * Get the current test configuration
 */
export function getConfig(): TestConfig {
    return { ...config };
}

/**
 * Update the test configuration
 */
export function setConfig(newConfig: Partial<TestConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
    config = {
        defaultTimeout: 5000,
        suiteTimeout: undefined,
        hookTimeout: 5000
    };
}
