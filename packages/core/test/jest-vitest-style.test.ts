// packages/core/test/jest-vitest-style.test.ts
// Demonstrating Jest/Vitest-style programmatic skip patterns

import { describe, it, itIf, itSkipIf, describeIf, describeSkipIf, platform, env } from '../src';
import { expect } from '@embedunit/assert';

// Import extended it and describe that have skipIf, runIf, etc.
import '../src/dsl-extended';

describe('Jest/Vitest Style Programmatic Skip', () => {

    // Cast to any to access extended properties
    const itExt = it as any;
    const describeExt = describe as any;

    // Vitest-style skipIf/runIf
    describe('skipIf and runIf patterns', () => {
        // Skip if on Windows
        itExt.skipIf(process.platform === 'win32')('Unix-only test', () => {
            expect(process.platform).not.toBe('win32');
        });

        // Run only if in CI
        itExt.runIf(process.env.CI === 'true')('CI-only test', () => {
            expect(process.env.CI).toBe('true');
        });

        // Skip entire suite conditionally
        describeExt.skipIf(!process.env.DATABASE_URL)('Database tests', () => {
            it('should connect to database', () => {
                expect(process.env.DATABASE_URL).toBeDefined();
            });
        });

        // Run suite only if feature is enabled
        const hasFeatureX = false;
        describeExt.runIf(hasFeatureX)('Feature X tests', () => {
            it('should test feature X', () => {
                expect(hasFeatureX).toBe(true);
            });
        });
    });

    // Platform-specific tests using helpers
    describe('Platform-specific tests', () => {
        platform.windows('Windows-specific test', () => {
            expect(process.platform).toBe('win32');
        });

        platform.mac('macOS-specific test', () => {
            expect(process.platform).toBe('darwin');
        });

        platform.linux('Linux-specific test', () => {
            expect(process.platform).toBe('linux');
        });

        platform.unix('Unix-like systems test', () => {
            expect(process.platform).not.toBe('win32');
        });

        platform.ci('CI environment test', () => {
            expect(process.env.CI).toBeTruthy();
        });

        platform.local('Local development test', () => {
            expect(process.env.CI).toBeFalsy();
        });
    });

    // TODO tests (placeholders)
    describe('TODO tests', () => {
        itExt.todo('implement user authentication');
        itExt.todo('add data validation', () => {
            // Even with implementation, todo tests are skipped
            throw new Error('Should not run');
        });

        describeExt.todo('Payment processing', () => {
            it('should process credit cards', () => {
                throw new Error('Should not run');
            });
        });
    });

    // Failing tests (expected failures)
    describe('Expected failures', () => {
        itExt.failing('known bug - division by zero', () => {
            const result = 1 / 0;
            expect(result).toBe(0); // This would fail, but it's expected
        });

        itExt.failing('feature not implemented yet', () => {
            throw new Error('Not implemented');
        });
    });

    // Dynamic conditions with functions
    describe('Dynamic conditions', () => {
        const checkDatabaseConnection = () => {
            // Simulate checking for database
            return false;
        };

        itSkipIf(checkDatabaseConnection)('test requiring database', () => {
            expect(true).toBe(true);
        });

        const isBusinessHours = () => {
            const hour = new Date().getHours();
            return hour >= 9 && hour < 17;
        };

        itIf(isBusinessHours)('business hours only test', () => {
            const hour = new Date().getHours();
            expect(hour).toBeGreaterThanOrEqual(9);
            expect(hour).toBeLessThan(17);
        });
    });

    // Environment-based tests
    describe('Environment-based tests', () => {
        env.test('test environment only', () => {
            expect(process.env.NODE_ENV).toBe('test');
        });

        env.development('development only', () => {
            expect(process.env.NODE_ENV).toBe('development');
        });

        env.production('production only', () => {
            expect(process.env.NODE_ENV).toBe('production');
        });
    });

    // Conditional describe with complex logic
    const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);

    describeIf(nodeVersion >= 18)('Node 18+ features', () => {
        it('should use modern features', () => {
            expect(nodeVersion).toBeGreaterThanOrEqual(18);
        });
    });

    describeSkipIf(process.platform === 'win32')('Unix file permissions', () => {
        it('should test chmod', () => {
            expect(process.platform).not.toBe('win32');
        });
    });
});

// Comparison table test
describe('Jest vs Vitest vs Our Implementation', () => {
    it('shows different skip patterns', () => {
        const patterns = {
            jest: {
                conditional: '(condition ? test : test.skip)',
                todo: 'test.todo("name")',
                skipInside: 'Not directly supported'
            },
            vitest: {
                conditional: 'test.skipIf(condition)',
                todo: 'test.todo("name")',
                skipInside: 'skip() or pending()'
            },
            ours: {
                conditional: 'it.skipIf(condition) or itSkipIf(condition)',
                todo: 'it.todo("name")',
                skipInside: 'Not yet supported (would need runtime skip)'
            }
        };

        expect(patterns).toBeDefined();
        expect(patterns.ours.conditional).toContain('skipIf');
    });
});
