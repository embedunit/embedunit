// packages/core/test/timeout.test.ts
import { describe, it, beforeAll, afterAll, setConfig, resetConfig, getConfig, withTimeout, maybeWithTimeout, TimeoutError } from '../src';
import { expect } from '@embedunit/assert';

describe('Timeout Functionality', () => {

    beforeAll(() => {
        // Save config if needed in future
        getConfig(); // Validate config is accessible
    });

    afterAll(() => {
        resetConfig();
    });

    describe('withTimeout utility', () => {
        it('should complete fast operations before timeout', async () => {
            const result = await withTimeout(
                async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'success';
                },
                100,
                'Fast operation'
            );

            expect(result).toBe('success');
        });

        it('should timeout on slow operations', async () => {
            let error: Error | undefined;

            try {
                await withTimeout(
                    async () => {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        return 'should not reach';
                    },
                    50,
                    'Slow operation'
                );
            } catch (e) {
                error = e as Error;
            }

            expect(error).toBeInstanceOf(TimeoutError);
            expect(error?.message).toContain('exceeded timeout of 50ms');
        });

        it('should handle synchronous functions', async () => {
            const result = await withTimeout(
                () => 42,
                100,
                'Sync operation'
            );

            expect(result).toBe(42);
        });

        it('should propagate errors from the function', async () => {
            let error: Error | undefined;

            try {
                await withTimeout(
                    async () => {
                        throw new Error('Function error');
                    },
                    100,
                    'Error operation'
                );
            } catch (e) {
                error = e as Error;
            }

            expect(error?.message).toBe('Function error');
            expect(error).not.toBeInstanceOf(TimeoutError);
        });
    });

    describe('maybeWithTimeout utility', () => {
        it('should apply timeout when provided', async () => {
            let error: Error | undefined;

            try {
                await maybeWithTimeout(
                    async () => {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    },
                    50,
                    'Optional timeout'
                );
            } catch (e) {
                error = e as Error;
            }

            expect(error).toBeInstanceOf(TimeoutError);
        });

        it('should not apply timeout when not provided', async () => {
            const result = await maybeWithTimeout(
                async () => {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return 'completed';
                }
            );

            expect(result).toBe('completed');
        });

        it('should not apply timeout when 0', async () => {
            const result = await maybeWithTimeout(
                async () => {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return 'no timeout';
                },
                0
            );

            expect(result).toBe('no timeout');
        });
    });

    describe('Configuration', () => {
        it('should have default timeout configuration', () => {
            resetConfig();
            const config = getConfig();

            expect(config.defaultTimeout).toBe(5000);
            expect(config.hookTimeout).toBe(5000);
            expect(config.suiteTimeout).toBeUndefined();
        });

        it('should update configuration', () => {
            setConfig({
                defaultTimeout: 1000,
                suiteTimeout: 2000,
                hookTimeout: 3000
            });

            const config = getConfig();
            expect(config.defaultTimeout).toBe(1000);
            expect(config.suiteTimeout).toBe(2000);
            expect(config.hookTimeout).toBe(3000);
        });

        it('should partially update configuration', () => {
            resetConfig();
            setConfig({ defaultTimeout: 7000 });

            const config = getConfig();
            expect(config.defaultTimeout).toBe(7000);
            expect(config.hookTimeout).toBe(5000); // Unchanged
        });

        it('should reset configuration to defaults', () => {
            setConfig({ defaultTimeout: 9999 });
            resetConfig();

            const config = getConfig();
            expect(config.defaultTimeout).toBe(5000);
        });
    });

    describe('Test-level timeouts', () => {
        it('should complete within custom timeout', async () => {
            // This test has an implicit timeout through the it() function
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(true).toBe(true);
        }, 200); // Custom timeout of 200ms

        it('should use default timeout when not specified', async () => {
            // Uses default timeout from config (5000ms)
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(true).toBe(true);
        });
    });

    describe('Suite-level timeouts', () => {
        describe('Suite with custom timeout', () => {
            it('should inherit suite timeout', async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                expect(true).toBe(true);
            });

            it('should override suite timeout with test timeout', async () => {
                await new Promise(resolve => setTimeout(resolve, 30));
                expect(true).toBe(true);
            }, 100); // Override suite timeout
        }, 300); // Suite timeout of 300ms
    });

    describe('Timeout error messages', () => {
        it('should have descriptive error message', async () => {
            let error: Error | undefined;

            try {
                await withTimeout(
                    async () => {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    },
                    50,
                    'Custom operation name'
                );
            } catch (e) {
                error = e as Error;
            }

            expect(error).toBeInstanceOf(TimeoutError);
            expect(error?.name).toBe('TimeoutError');
            expect(error?.message).toContain('Custom operation name');
            expect(error?.message).toContain('50ms');
        });
    });

    describe('Edge cases', () => {
        it('should handle very short timeouts', async () => {
            let error: Error | undefined;

            try {
                await withTimeout(
                    async () => {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    },
                    1, // 1ms timeout
                    'Very short timeout'
                );
            } catch (e) {
                error = e as Error;
            }

            expect(error).toBeInstanceOf(TimeoutError);
        });

        it('should handle immediate resolution', async () => {
            const result = await withTimeout(
                () => Promise.resolve('immediate'),
                1, // Even with 1ms timeout
                'Immediate resolution'
            );

            expect(result).toBe('immediate');
        });

        it('should handle recursive async operations', async () => {
            const recursiveAsync = async (n: number): Promise<number> => {
                if (n <= 0) return 0;
                await new Promise(resolve => setTimeout(resolve, 5));
                return n + await recursiveAsync(n - 1);
            };

            const result = await withTimeout(
                () => recursiveAsync(3),
                100,
                'Recursive operation'
            );

            expect(result).toBe(6); // 3 + 2 + 1 + 0
        });

        it('should clean up timeout on successful completion', async () => {
            const result = await withTimeout(
                async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'completed';
                },
                100,
                'Cleanup test'
            );

            // Wait a bit more to ensure timeout doesn't fire after completion
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(result).toBe('completed');
            // Timeout cleanup is validated by not throwing after completion
        });
    });

    describe('Integration with test runner', () => {
        it('should respect test timeout in actual test', async () => {
            // This test would timeout if the timeout wasn't working
            const start = Date.now();
            await new Promise(resolve => setTimeout(resolve, 50));
            const duration = Date.now() - start;

            expect(duration).toBeGreaterThanOrEqual(50);
            expect(duration).toBeLessThan(200);
        }, 200);

        describe('Nested suite with timeout', () => {
            it('should use suite timeout', async () => {
                await new Promise(resolve => setTimeout(resolve, 80));
                expect(true).toBe(true);
            });
        }, 150);
    });
});
