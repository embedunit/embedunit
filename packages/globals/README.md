# @embedunit/globals

Optional global installation for embedunit. Installs testing functions (`describe`, `it`, `expect`, etc.) onto `globalThis` for a familiar Jest/Mocha-style experience.

## Installation

```bash
npm install @embedunit/globals
```

## Usage

### Basic Installation

```typescript
import { installGlobals, uninstallGlobals, runTests } from '@embedunit/globals';

installGlobals();

// Now use globals directly
describe('Math', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2);
  });
});

await runTests();

// Clean up when done
uninstallGlobals();
```

### Installed Globals

By default, installs: `describe`, `it`, `expect`, `beforeAll`, `beforeEach`, `afterEach`, `afterAll`, `xit`, `xdescribe`, `fit`, `fdescribe`, `spyOn`, `mock`

## Options

### Collision Policies

Control behavior when a global already exists:

```typescript
// Throw error if global exists (default)
installGlobals({ collisionPolicy: 'error' });

// Log warning but overwrite
installGlobals({ collisionPolicy: 'warn' });

// Skip globals that already exist
installGlobals({ collisionPolicy: 'skip' });

// Silently overwrite
installGlobals({ collisionPolicy: 'force' });
```

### Namespace

Avoid polluting global scope by using a namespace:

```typescript
installGlobals({ namespace: 'embedunit' });

// Access via namespace
embedunit.describe('Test', () => {
  embedunit.it('works', () => {
    embedunit.expect(true).toBe(true);
  });
});

// Clean up
uninstallGlobals('embedunit');
```

### Selective Installation

Install only specific globals:

```typescript
installGlobals({ include: ['describe', 'it', 'expect'] });
// Only describe, it, and expect are installed
```

## Direct Imports

All functions are also available as direct imports:

```typescript
import { describe, it, expect, runTests } from '@embedunit/globals';
```

## When to Use

**Use globals when:**
- Migrating from Jest/Mocha and want familiar syntax
- Writing quick tests where imports feel heavy
- Global scope is acceptable for your use case

**Avoid globals when:**
- Multiple test frameworks may conflict
- You prefer explicit imports for clarity
- Running in shared/production environments

## TypeScript

For TypeScript support with globals, add to your test file:

```typescript
declare const describe: typeof import('@embedunit/globals').describe;
declare const it: typeof import('@embedunit/globals').it;
declare const expect: typeof import('@embedunit/globals').expect;
```

## Links

- [embedunit repository](https://github.com/nickebbitt/embedunit)
- [@embedunit/core](../core/README.md)
- [@embedunit/assert](../assert/README.md)
