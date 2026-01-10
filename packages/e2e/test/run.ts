// E2E Test Runner
// Runs Node.js VM, QuickJS, and Deno tests (Playwright runs separately via playwright test)
import { runTests, resetRegistry } from '@embedunit/core';

// Parse command line args for filtering
const args = process.argv.slice(2);
const filterArg = args.find(arg => arg.startsWith('--filter='));
const filter = filterArg ? filterArg.split('=')[1] : null;

// Import tests based on filter
async function loadTests() {
    if (!filter || filter === 'node') {
        await import('./node/node-vm.test.js');
    }
    if (!filter || filter === 'quickjs') {
        await import('./quickjs/quickjs.test.js');
    }
    if (!filter || filter === 'deno') {
        await import('./deno/deno.test.js');
    }
}

async function main() {
    console.log('EmbedUnit E2E Tests');
    console.log('===================\n');

    if (filter) {
        console.log(`Filter: ${filter}\n`);
    }

    await loadTests();

    const result = await runTests({
        includePassed: true,
        includeSkipped: true
    });

    console.log('\n--- E2E Test Summary ---');
    console.log(`Total: ${result.summary.total}`);
    console.log(`Passed: ${result.summary.passed}`);
    console.log(`Failed: ${result.summary.failed}`);
    console.log(`Skipped: ${result.summary.skipped}`);
    console.log(`Duration: ${result.summary.duration}ms`);

    if (result.summary.failed > 0) {
        console.log('\n--- Failures ---');
        result.failures?.forEach(failure => {
            console.log(`\n${failure.suite} > ${failure.test}`);
            // Handle different error types
            const error = failure.error;
            if (typeof error === 'string') {
                console.log(`  ${error}`);
            } else if (error instanceof Error) {
                console.log(`  ${error.message}`);
                if (error.stack) {
                    console.log(`  ${error.stack.split('\n').slice(1, 4).join('\n  ')}`);
                }
            } else if (error && typeof error === 'object') {
                console.log(`  ${(error as any).message || JSON.stringify(error)}`);
            } else {
                console.log(`  ${String(error)}`);
            }
        });
        process.exit(1);
    }

    console.log('\nAll E2E tests passed!');
    process.exit(0);
}

main().catch(err => {
    console.error('E2E test runner error:', err);
    process.exit(1);
});
