// packages/core/test/suite-tags.test.ts
import { describe, it, resetRegistry, runTests, getTestList } from '../src';
import { expect } from '@embedunit/assert';

describe('Suite-level Tags', () => {

    describe('Basic suite tagging', () => {
        it('should extract tags from suite names', async () => {
            resetRegistry();

            describe('API tests @api @integration', () => {
                it('test 1', () => {
                    expect(true).toBe(true);
                });
                it('test 2', () => {
                    expect(true).toBe(true);
                });
            });

            const result = await runTests({ tags: ['api'] });

            // Both tests should run because they inherit the @api tag
            expect(result.summary.total).toBe(2);
            expect(result.summary.passed).toBe(2);
        });

        it('should filter tests by suite tags', async () => {
            resetRegistry();

            describe('Unit tests @unit', () => {
                it('unit test 1', () => {
                    expect(true).toBe(true);
                });
                it('unit test 2', () => {
                    expect(true).toBe(true);
                });
            });

            describe('Integration tests @integration', () => {
                it('integration test 1', () => {
                    expect(true).toBe(true);
                });
                it('integration test 2', () => {
                    expect(true).toBe(true);
                });
            });

            // Run only unit tests
            const unitResult = await runTests({ tags: ['unit'] });
            expect(unitResult.summary.total).toBe(2);
            expect(unitResult.summary.passed).toBe(2);

            // Run only integration tests
            resetRegistry();
            describe('Unit tests @unit', () => {
                it('unit test 1', () => {
                    expect(true).toBe(true);
                });
                it('unit test 2', () => {
                    expect(true).toBe(true);
                });
            });

            describe('Integration tests @integration', () => {
                it('integration test 1', () => {
                    expect(true).toBe(true);
                });
                it('integration test 2', () => {
                    expect(true).toBe(true);
                });
            });

            const integrationResult = await runTests({ tags: ['integration'] });
            expect(integrationResult.summary.total).toBe(2);
            expect(integrationResult.summary.passed).toBe(2);
        });

        it('should handle multiple tags on suites', async () => {
            resetRegistry();

            describe('Performance tests @slow @integration @network', () => {
                it('test 1', () => {
                    expect(true).toBe(true);
                });
                it('test 2', () => {
                    expect(true).toBe(true);
                });
            });

            describe('Fast tests @fast @unit', () => {
                it('test 3', () => {
                    expect(true).toBe(true);
                });
            });

            // Filter by @slow tag
            const slowResult = await runTests({ tags: ['slow'] });
            expect(slowResult.summary.total).toBe(2);

            // Reset and test @fast tag
            resetRegistry();
            describe('Performance tests @slow @integration @network', () => {
                it('test 1', () => {
                    expect(true).toBe(true);
                });
                it('test 2', () => {
                    expect(true).toBe(true);
                });
            });

            describe('Fast tests @fast @unit', () => {
                it('test 3', () => {
                    expect(true).toBe(true);
                });
            });

            const fastResult = await runTests({ tags: ['fast'] });
            expect(fastResult.summary.total).toBe(1);

            // Reset and test multiple tags (OR condition)
            resetRegistry();
            describe('Performance tests @slow @integration @network', () => {
                it('test 1', () => {
                    expect(true).toBe(true);
                });
                it('test 2', () => {
                    expect(true).toBe(true);
                });
            });

            describe('Fast tests @fast @unit', () => {
                it('test 3', () => {
                    expect(true).toBe(true);
                });
            });

            const multiResult = await runTests({ tags: ['slow', 'fast'] });
            expect(multiResult.summary.total).toBe(3); // All tests match
        });
    });

    describe('Tag inheritance', () => {
        it('should inherit tags from parent suite', async () => {
            resetRegistry();

            describe('Backend @backend', () => {
                describe('API @api', () => {
                    it('endpoint test', () => {
                        expect(true).toBe(true);
                    });
                });

                describe('Database @db', () => {
                    it('query test', () => {
                        expect(true).toBe(true);
                    });
                });
            });

            // Filter by @backend - should run all tests
            const backendResult = await runTests({ tags: ['backend'] });
            expect(backendResult.summary.total).toBe(2);

            // Reset and filter by @api - should run only API test
            resetRegistry();
            describe('Backend @backend', () => {
                describe('API @api', () => {
                    it('endpoint test', () => {
                        expect(true).toBe(true);
                    });
                });

                describe('Database @db', () => {
                    it('query test', () => {
                        expect(true).toBe(true);
                    });
                });
            });

            const apiResult = await runTests({ tags: ['api'] });
            expect(apiResult.summary.total).toBe(1);
        });

        it('should inherit tags through multiple levels', async () => {
            resetRegistry();

            describe('Application @app', () => {
                describe('Frontend @frontend', () => {
                    describe('Components @components', () => {
                        it('button test', () => {
                            expect(true).toBe(true);
                        });
                    });

                    describe('Services @services', () => {
                        it('api service test', () => {
                            expect(true).toBe(true);
                        });
                    });
                });
            });

            // Test should have tags: @app, @frontend, @components
            const componentsResult = await runTests({ tags: ['components'] });
            expect(componentsResult.summary.total).toBe(1);

            // All tests should have @app tag
            resetRegistry();
            describe('Application @app', () => {
                describe('Frontend @frontend', () => {
                    describe('Components @components', () => {
                        it('button test', () => {
                            expect(true).toBe(true);
                        });
                    });

                    describe('Services @services', () => {
                        it('api service test', () => {
                            expect(true).toBe(true);
                        });
                    });
                });
            });

            const appResult = await runTests({ tags: ['app'] });
            expect(appResult.summary.total).toBe(2);

            // Frontend tests
            resetRegistry();
            describe('Application @app', () => {
                describe('Frontend @frontend', () => {
                    describe('Components @components', () => {
                        it('button test', () => {
                            expect(true).toBe(true);
                        });
                    });

                    describe('Services @services', () => {
                        it('api service test', () => {
                            expect(true).toBe(true);
                        });
                    });
                });
            });

            const frontendResult = await runTests({ tags: ['frontend'] });
            expect(frontendResult.summary.total).toBe(2);
        });

        it('should combine test tags with inherited suite tags', async () => {
            resetRegistry();

            describe('Features @feature', () => {
                it('basic test @unit', () => {
                    expect(true).toBe(true);
                });

                it('complex test @integration', () => {
                    expect(true).toBe(true);
                });

                it('performance test @slow', () => {
                    expect(true).toBe(true);
                });
            });

            // All tests have @feature tag
            const featureResult = await runTests({ tags: ['feature'] });
            expect(featureResult.summary.total).toBe(3);

            // Only one test has @unit tag
            resetRegistry();
            describe('Features @feature', () => {
                it('basic test @unit', () => {
                    expect(true).toBe(true);
                });

                it('complex test @integration', () => {
                    expect(true).toBe(true);
                });

                it('performance test @slow', () => {
                    expect(true).toBe(true);
                });
            });

            const unitResult = await runTests({ tags: ['unit'] });
            expect(unitResult.summary.total).toBe(1);

            // Test with multiple tags
            resetRegistry();
            describe('Features @feature', () => {
                it('basic test @unit', () => {
                    expect(true).toBe(true);
                });

                it('complex test @integration', () => {
                    expect(true).toBe(true);
                });

                it('performance test @slow', () => {
                    expect(true).toBe(true);
                });
            });

            const multiResult = await runTests({ tags: ['unit', 'slow'] });
            expect(multiResult.summary.total).toBe(2); // @unit and @slow tests
        });

        it('should not have duplicate tags when inheriting', async () => {
            resetRegistry();

            describe('System @system @important', () => {
                describe('Critical @important @critical', () => {
                    it('test @important', () => {
                        expect(true).toBe(true);
                    });
                });
            });

            // Get test list to inspect tags
            const tests = getTestList();
            const test = tests.find(t => t.test === 'test');

            // Should have unique tags: @important, @system, @critical
            expect(test).toBeDefined();
            if (test) {
                expect(test.tags).toContain('important');
                expect(test.tags).toContain('system');
                expect(test.tags).toContain('critical');
                // Check no duplicates
                const importantCount = test.tags.filter(t => t === 'important').length;
                expect(importantCount).toBe(1);
            }
        });
    });

    describe('Tag visibility in getTestList', () => {
        it('should include inherited tags in getTestList output', () => {
            resetRegistry();

            describe('Parent @parent', () => {
                describe('Child @child', () => {
                    it('test @test', () => {
                        expect(true).toBe(true);
                    });
                });
            });

            const tests = getTestList();
            expect(tests).toHaveLength(1);

            const test = tests[0];
            expect(test.tags).toContain('parent');
            expect(test.tags).toContain('child');
            expect(test.tags).toContain('test');
        });

        it('should show correct tags for multiple tests', () => {
            resetRegistry();

            describe('Suite @suite', () => {
                it('test1 @fast', () => {
                    expect(true).toBe(true);
                });

                it('test2 @slow', () => {
                    expect(true).toBe(true);
                });
            });

            describe('Other @other', () => {
                it('test3 @unit', () => {
                    expect(true).toBe(true);
                });
            });

            const tests = getTestList();
            expect(tests).toHaveLength(3);

            const test1 = tests.find(t => t.test === 'test1');
            const test2 = tests.find(t => t.test === 'test2');
            const test3 = tests.find(t => t.test === 'test3');

            expect(test1?.tags).toContain('suite');
            expect(test1?.tags).toContain('fast');
            expect(test1?.tags).not.toContain('slow');

            expect(test2?.tags).toContain('suite');
            expect(test2?.tags).toContain('slow');
            expect(test2?.tags).not.toContain('fast');

            expect(test3?.tags).toContain('other');
            expect(test3?.tags).toContain('unit');
            expect(test3?.tags).not.toContain('suite');
        });
    });

    describe('Tag stripping in suite/test names', () => {
        it('should match suite with tags in filter name', async () => {
            resetRegistry();

            describe('API Tests @api @integration', () => {
                it('test 1', () => {
                    expect(true).toBe(true);
                });
            });

            // Should work with tags in the filter (they get stripped)
            const result = await runTests({
                only: { suite: 'API Tests @api @integration' }
            });
            expect(result.summary.total).toBe(1);
            expect(result.summary.passed).toBe(1);

            // Should also work without tags
            resetRegistry();
            describe('API Tests @api @integration', () => {
                it('test 1', () => {
                    expect(true).toBe(true);
                });
            });

            const result2 = await runTests({
                only: { suite: 'API Tests' }
            });
            expect(result2.summary.total).toBe(1);
            expect(result2.summary.passed).toBe(1);
        });

        it('should match test with tags in filter name', async () => {
            resetRegistry();

            describe('Suite', () => {
                it('my test @fast @unit', () => {
                    expect(true).toBe(true);
                });
                it('other test', () => {
                    expect(true).toBe(true);
                });
            });

            // Should work with tags in the test name filter
            const result = await runTests({
                only: { test: 'my test @fast @unit' }
            });
            expect(result.summary.total).toBe(1);
            expect(result.summary.passed).toBe(1);

            // Should also work without tags
            resetRegistry();
            describe('Suite', () => {
                it('my test @fast @unit', () => {
                    expect(true).toBe(true);
                });
                it('other test', () => {
                    expect(true).toBe(true);
                });
            });

            const result2 = await runTests({
                only: { test: 'my test' }
            });
            expect(result2.summary.total).toBe(1);
            expect(result2.summary.passed).toBe(1);
        });
    });

    describe('Exclude tags', () => {
        it('should exclude tests with specified tags', async () => {
            resetRegistry();

            describe('Test Suite', () => {
                it('fast test @fast', () => {
                    expect(true).toBe(true);
                });
                it('slow test @slow', () => {
                    expect(true).toBe(true);
                });
                it('normal test', () => {
                    expect(true).toBe(true);
                });
            });

            // Exclude slow tests
            const result = await runTests({
                excludeTags: ['slow']
            });
            expect(result.summary.total).toBe(2); // fast and normal tests
            expect(result.summary.passed).toBe(2);
        });

        it('should exclude tests with inherited tags', async () => {
            resetRegistry();

            describe('Integration Suite @integration', () => {
                it('test 1', () => {
                    expect(true).toBe(true);
                });
                it('test 2', () => {
                    expect(true).toBe(true);
                });
            });

            describe('Unit Suite @unit', () => {
                it('test 3', () => {
                    expect(true).toBe(true);
                });
            });

            // Exclude integration tests
            const result = await runTests({
                excludeTags: ['integration']
            });
            expect(result.summary.total).toBe(1); // Only unit test
            expect(result.summary.passed).toBe(1);
        });

        it('should support multiple exclude tags (OR condition)', async () => {
            resetRegistry();

            describe('Test Suite', () => {
                it('test @slow', () => {
                    expect(true).toBe(true);
                });
                it('test @flaky', () => {
                    expect(true).toBe(true);
                });
                it('test @experimental', () => {
                    expect(true).toBe(true);
                });
                it('stable test @stable', () => {
                    expect(true).toBe(true);
                });
            });

            // Exclude slow, flaky, and experimental tests
            const result = await runTests({
                excludeTags: ['slow', 'flaky', 'experimental']
            });
            expect(result.summary.total).toBe(1); // Only stable test
            expect(result.summary.passed).toBe(1);
        });

        it('should combine include and exclude tags', async () => {
            resetRegistry();

            describe('Backend @backend', () => {
                it('fast db test @db @fast', () => {
                    expect(true).toBe(true);
                });
                it('slow db test @db @slow', () => {
                    expect(true).toBe(true);
                });
                it('api test @api @fast', () => {
                    expect(true).toBe(true);
                });
            });

            // Include backend tests but exclude slow ones
            const result = await runTests({
                tags: ['backend'],
                excludeTags: ['slow']
            });
            expect(result.summary.total).toBe(2); // fast db and api tests
            expect(result.summary.passed).toBe(2);
        });

        it('should work with getTestList', () => {
            resetRegistry();

            describe('Suite', () => {
                it('test @include', () => {});
                it('test @exclude', () => {});
                it('test @include @exclude', () => {});
            });

            const filtered = getTestList({
                tags: ['include'],
                excludeTags: ['exclude']
            });

            expect(filtered).toHaveLength(1);
            expect(filtered[0].tags).toContain('include');
            expect(filtered[0].tags).not.toContain('exclude');
        });
    });

    describe('Edge cases', () => {
        it('should handle suites with no tags', async () => {
            resetRegistry();

            describe('No tags suite', () => {
                it('test @tagged', () => {
                    expect(true).toBe(true);
                });

                it('untagged test', () => {
                    expect(true).toBe(true);
                });
            });

            const taggedResult = await runTests({ tags: ['tagged'] });
            expect(taggedResult.summary.total).toBe(1);
        });

        it('should handle empty tag filter', async () => {
            resetRegistry();

            describe('Suite @suite', () => {
                it('test', () => {
                    expect(true).toBe(true);
                });
            });

            // Empty tags array should run all tests
            const result = await runTests({ tags: [] });
            expect(result.summary.total).toBe(1);
        });

        it('should handle special characters in tags', async () => {
            resetRegistry();

            describe('Suite @tag_with_underscore @tag123', () => {
                it('test', () => {
                    expect(true).toBe(true);
                });
            });

            const underscoreResult = await runTests({ tags: ['tag_with_underscore'] });
            expect(underscoreResult.summary.total).toBe(1);

            resetRegistry();
            describe('Suite @tag_with_underscore @tag123', () => {
                it('test', () => {
                    expect(true).toBe(true);
                });
            });

            const numberResult = await runTests({ tags: ['tag123'] });
            expect(numberResult.summary.total).toBe(1);
        });
    });
});
