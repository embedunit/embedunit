# @embedunit/preset-recommended

All-in-one preset that combines all embedunit packages into a single import. Perfect for getting started quickly without managing individual package dependencies.

## Installation

```bash
npm install @embedunit/preset-recommended
```

## Usage

### Default Export

The default export provides everything you need:

```typescript
import EmbedUnit from '@embedunit/preset-recommended';

const { describe, it, expect, runTests, spy } = EmbedUnit;

describe('Calculator', () => {
  it('adds numbers', () => {
    expect(1 + 2).toBe(3);
  });

  it('tracks function calls', () => {
    const fn = spy();
    fn('hello');
    expect(fn).toHaveBeenCalledWith('hello');
  });
});

await runTests();
```

### Named Exports

All exports are also available as named imports:

```typescript
import { describe, it, expect, runTests, spy } from '@embedunit/preset-recommended';
```

## What's Included

This preset re-exports everything from:

| Package | Provides |
|---------|----------|
| `@embedunit/core` | `describe`, `it`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`, `runTests`, `getTestList`, `resetRunner` |
| `@embedunit/assert` | `expect`, `Assertion` |
| `@embedunit/spy` | `spy`, `spyOn`, `spyAsync`, `mock`, `Spy` |
| `@embedunit/globals` | `installGlobals`, `uninstallGlobals` |
| `@embedunit/reporters-minimal` | `consoleReporter`, `createCallbackReporter` |

## Default Export Object

```typescript
const EmbedUnit = {
  // Core
  describe, it, beforeEach, afterEach, beforeAll, afterAll,
  runTests, getTestList, resetRunner,

  // Assert
  expect, Assertion,

  // Spy
  spy, spyOn, spyAsync, mock, Spy,

  // Globals
  installGlobals, uninstallGlobals,

  // Reporters
  consoleReporter, createCallbackReporter
};
```

## When to Use This Preset

**Use the preset when:**
- Getting started with embedunit
- You need most or all features
- You prefer a single import for simplicity
- Bundle size is not critical

**Use individual packages when:**
- You only need specific features (e.g., just assertions)
- Bundle size is critical for your embedded runtime
- You want explicit control over dependencies

### Example: Individual Packages

```typescript
// Minimal setup - just core and assertions
import { describe, it, runTests } from '@embedunit/core';
import { expect } from '@embedunit/assert';
```

### Example: Preset

```typescript
// Everything in one import
import EmbedUnit from '@embedunit/preset-recommended';
```

## Links

- [Main Repository](https://github.com/nicksrandall/embedunit)
- [@embedunit/core](https://www.npmjs.com/package/@embedunit/core)
- [@embedunit/assert](https://www.npmjs.com/package/@embedunit/assert)
- [@embedunit/spy](https://www.npmjs.com/package/@embedunit/spy)

## License

MIT
