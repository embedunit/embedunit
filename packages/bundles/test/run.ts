// Test runner for bundles package
import { runTests, resetRegistry } from '@embedunit/core';

// Import all test files
import './bundles.test';

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
