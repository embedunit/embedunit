# @embedunit/core

Test runner core for embedded JavaScript runtimes. Provides a Jest/JUnit-style API (describe, it, hooks) designed to run inside engines, SDKs, and other non-Node environments.

## Installation

```bash
npm install @embedunit/core
```

## Basic Usage

```typescript
import { describe, it, runTests } from '@embedunit/core';

describe('Calculator', () => {
  it('adds numbers', () => {
    if (1 + 2 !== 3) throw new Error('Addition failed');
  });

  it('multiplies numbers', () => {
    if (2 * 3 !== 6) throw new Error('Multiplication failed');
  });
});

// Run all registered tests
const results = await runTests();
console.log(results.summary); // { total: 2, passed: 2, failed: 0, ... }
```

## Key Exports

### Test DSL

- `describe(name, fn, timeout?)` - Create a test suite
- `it(name, fn, timeout?)` / `test(name, fn, timeout?)` - Define a test case
- `beforeAll(fn)` - Run once before all tests in suite
- `beforeEach(fn)` - Run before each test
- `afterEach(fn)` - Run after each test
- `afterAll(fn)` - Run once after all tests in suite

### Runner

- `runTests(options?)` - Execute tests and return results
- `getTestList(options?)` - Get list of registered tests without running

### Configuration

- `setConfig(config)` - Update global configuration
- `getConfig()` - Get current configuration
- `resetConfig()` - Reset to defaults

## Lifecycle Hooks

```typescript
describe('Database tests', () => {
  let db;

  beforeAll(async () => {
    db = await connectToDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(() => {
    db.beginTransaction();
  });

  afterEach(() => {
    db.rollback();
  });

  it('queries data', async () => {
    const result = await db.query('SELECT 1');
    // assertions...
  });
});
```

## Timeout Configuration

### Global Default

```typescript
import { setConfig } from '@embedunit/core';

setConfig({
  defaultTimeout: 10000, // 10 seconds for all tests
  hookTimeout: 5000      // 5 seconds for hooks
});
```

### Per-Suite Timeout

```typescript
describe('Slow tests', () => {
  // All tests in this suite get 30s timeout
}, 30000);
```

### Per-Test Timeout

```typescript
it('long running test', async () => {
  await someLongOperation();
}, 60000); // 60 second timeout
```

## Skip and Only

### Skipping Tests

```typescript
describe.skip('Broken feature', () => {
  it('will not run', () => {});
});

it.skip('temporarily disabled', () => {});

// Aliases
xdescribe('also skipped', () => {});
xit('also skipped', () => {});
```

### Focusing Tests

```typescript
describe.only('Only this suite runs', () => {
  it('will run', () => {});
});

it.only('only this test runs', () => {});

// Aliases
fdescribe('focused suite', () => {});
fit('focused test', () => {});
```

## Parameterized Tests

### Array of Arrays

```typescript
it.each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 2, 4]
])('adds %d + %d to equal %d', (a, b, expected) => {
  if (a + b !== expected) throw new Error('Failed');
});
```

### Array of Objects

```typescript
it.each([
  { input: 'hello', expected: 5 },
  { input: 'world', expected: 5 }
])('$input has length $expected', ({ input, expected }) => {
  if (input.length !== expected) throw new Error('Failed');
});
```

### With describe.each

```typescript
describe.each([
  ['admin', true],
  ['guest', false]
])('User role: %s', (role, canDelete) => {
  it('has correct permissions', () => {
    // test using role and canDelete
  });
});
```

## Filtering Tests

### By Suite/Test Name

```typescript
const results = await runTests({
  only: { suite: 'Calculator' }
});

// Multiple suites
const results = await runTests({
  only: { suites: ['Calculator', 'Parser'] }
});
```

### By Pattern (grep)

```typescript
const results = await runTests({
  grep: /should.*correctly/
});
```

### By Tags

```typescript
describe('@integration Database', () => {
  it('@slow queries large dataset', () => {});
});

// Run only integration tests
await runTests({ tags: ['integration'] });

// Exclude slow tests
await runTests({ excludeTags: ['slow'] });
```

### Custom Filter

```typescript
const results = await runTests({
  filter: (suite, test) => suite.includes('critical')
});
```

## Run Options

```typescript
const results = await runTests({
  bail: true,           // Stop on first failure
  includePassed: true,  // Include passed tests in results
  includeSkipped: true, // Include skipped tests in results
  verboseErrors: true,  // Full error details with stack traces
  onEvent: (event) => {
    // Handle test events: start, pass, fail, skip, complete
    console.log(event.type, event.test);
  }
});
```

## Result Structure

```typescript
interface TestRunResult {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    success: boolean;
  };
  failures: Array<{
    suite: string;
    test: string;
    error: { message: string; file?: string; line?: number };
    duration: number;
  }>;
  passed?: Array<{ suite: string; test: string; duration: number }>;
  skipped?: Array<{ suite: string; test: string }>;
}
```

## Extended DSL

Conditional test helpers for platform-specific tests:

```typescript
import { itIf, describeIf, platform, env } from '@embedunit/core';

// Run test only in browser
itIf(platform.isBrowser)('uses localStorage', () => {});

// Run suite only when env var is set
describeIf(env('CI'))('CI-only tests', () => {});

// Skip test based on condition
itSkipIf(platform.isNode)('browser-only feature', () => {});
```

## Links

- [Main Repository](https://github.com/nicobrinkkemper/embedunit)
- [Full Documentation](https://github.com/nicobrinkkemper/embedunit#readme)
