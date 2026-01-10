# embedunit

**embedunit** is a tiny, dependency-free test runner for *embedded JavaScript runtimes*. It provides a Jest/JUnit-style API (describe, it, async hooks) in a **single JS file**, designed to run *inside* engines, SDKs, simulations, and other non-Node environments where traditional test frameworks don't fit.

## What it is

* Nested describe / it suites with parent-child hook inheritance
* Fully async tests and hooks (beforeAll, beforeEach, afterEach, afterAll)
* Deterministic, sequential execution (integration-test friendly)
* Zero runtime dependencies
* No CLI, no filesystem scanning, no built-in UI

## What it is not

* Not a Jest/Mocha replacement for web apps
* Not a CLI runner or watch tool
* Not a reporter ecosystem
* Not tied to any engine or platform

## Intended use cases

* Game engines with embedded JS (Cocos, custom engines, simulations)
* SDKs and libraries tested *inside* host applications
* Browser extensions and sandboxed runtimes
* QuickJS / JavaScriptCore / WASM-hosted JS

Think of **embedunit** as:

> **JUnit for embedded JavaScript runtimes**

Small, predictable, and meant to disappear into your runtime rather than take it over.

## Packages

| Package | Description |
|---------|-------------|
| `@embedunit/core` | Suite/test tree, hooks, async execution, event model |
| `@embedunit/assert` | Assertion utilities (expect, matchers) |
| `@embedunit/spy` | Spy/stub/mock primitives |
| `@embedunit/globals` | Optional global installation (describe/it/expect) |
| `@embedunit/reporters-minimal` | Console/callback reporter |
| `@embedunit/preset-recommended` | All-in-one convenience package |
| `@embedunit/bundles` | IIFE bundles for embedded runtimes |

## Quick Start

### Using individual packages (ESM)

```typescript
import { describe, it, beforeEach, runTests } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import '@embedunit/spy'; // Enables spy assertions

describe('Calculator', () => {
  it('adds numbers', () => {
    expect(1 + 2).toBe(3);
  });
});

const result = await runTests();
```

### Using the preset (all-in-one)

```typescript
import EmbedUnit from '@embedunit/preset-recommended';

const { describe, it, expect, runTests } = EmbedUnit;

describe('Calculator', () => {
  it('adds numbers', () => {
    expect(1 + 2).toBe(3);
  });
});

const result = await runTests();
```

### Using IIFE bundles (embedded runtimes)

```html
<script src="embedunit.recommended.global.js"></script>
<script>
  const { describe, it, expect, runTests } = EmbedUnit;

  describe('Game Logic', () => {
    it('works', () => {
      expect(true).toBe(true);
    });
  });

  runTests();
</script>
```

### Installing globals

```typescript
import { installGlobals } from '@embedunit/globals';

// Install describe, it, expect, etc. as globals
installGlobals();

// Or with collision detection
installGlobals({ collisionPolicy: 'error' });

// Or under a namespace
installGlobals({ namespace: 'embedunit' });
// Access as: embedunit.describe, embedunit.it, etc.
```

## API

### Core (`@embedunit/core`)

```typescript
// Test structure
describe(name, fn)
describe.skip(name, fn)
describe.only(name, fn)

it(name, fn, timeout?)
it.skip(name, fn)
it.only(name, fn)

// Lifecycle hooks
beforeAll(fn)
beforeEach(fn)
afterEach(fn)
afterAll(fn)

// Parameterized tests
it.each(table)(name, fn)
describe.each(table)(name, fn)

// Test execution
runTests(options?) // Returns Promise<TestRunResult>
getTestList(options?) // Returns TestMeta[]
```

### Assert (`@embedunit/assert`)

```typescript
expect(value).toBe(expected)
expect(value).toEqual(expected)
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()
expect(value).toBeGreaterThan(n)
expect(value).toBeLessThan(n)
expect(value).toContain(item)
expect(value).toHaveLength(n)
expect(value).toHaveProperty(path, value?)
expect(value).toBeInstanceOf(Class)
expect(value).toMatch(pattern)
expect(fn).toThrow(error?)

// Promise assertions
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow(error)

// Negation
expect(value).not.toBe(expected)
```

### Spy (`@embedunit/spy`)

```typescript
const spy = spyOn(object, 'method')
const spy = createSpyFunction('name')

spy.returnValue(value)
spy.returnValues(...values)
spy.throwError(error)
spy.callFake(fn)
spy.callThrough()
spy.restore()
spy.reset()

expect(spy).toHaveBeenCalled()
expect(spy).toHaveBeenCalledWith(...args)
expect(spy).toHaveBeenCalledTimes(n)
```

## Bundle Outputs

| Bundle | Description |
|--------|-------------|
| `embedunit.recommended.global.js` | Full bundle, exposes `EmbedUnit` global |
| `embedunit.recommended.globals.js` | Full bundle + auto-installs globals |
| `embedunit.lite.global.js` | Minimal bundle (core + assert only) |

All bundles have corresponding `.min.js` minified versions.

## License

MIT
