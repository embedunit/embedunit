// Test runner for core package
import { runTests, resetRegistry } from '../src';

// Import all test files
import './hooks.test';
import './async-hooks.test';
import './execution-order.test';
import './skip-basic.test';
import './timeout.test';
import './log-capture.test';
import './nested-hooks.test';
import './skip-only.test';
import './suite-tags.test';
import './hook-inheritance.test';
import './api-validation.test';
import './error.test';
import './parameterized.test';
import './jest-vitest-style.test';
import './silent-runner.test';
import './timeout-validation.test';
import './programmatic-skip.test';
import './skip-events.test';
import './only-suite-nested.test';
import './skip-only-edge-cases.test';
import './filtered-getTestList.test';
import './multiple-suite-filter.test';
import './debug-suite-filtering.test';
import './suite-filtering-bug.test';
import './test-alias.test';

async function main() {
    const result = await runTests({
        includePassed: true,
        includeSkipped: true
    });

    console.log('\n--- Test Summary ---');
    console.log(`Total: ${result.summary.total}`);
    console.log(`Passed: ${result.summary.passed}`);
    console.log(`Failed: ${result.summary.failed}`);
    console.log(`Skipped: ${result.summary.skipped}`);
    console.log(`Duration: ${result.summary.duration}ms`);

    if (result.summary.failed > 0) {
        console.log('\n--- Failures ---');
        result.failures?.forEach(failure => {
            console.log(`\n${failure.suite} > ${failure.test}`);
            console.log(`  ${failure.error}`);
        });
        process.exit(1);
    }

    process.exit(0);
}

main().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
