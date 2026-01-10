# @embedunit/assert

Jest-style assertions for embedded JavaScript runtimes. Zero dependencies, portable, and designed to work inside game engines, simulations, and other non-Node environments.

## Installation

```bash
npm install @embedunit/assert
```

## Basic Usage

```typescript
import { expect } from '@embedunit/assert';

// Strict equality
expect(1 + 1).toBe(2);
expect('hello').toBe('hello');

// Deep equality
expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 });
expect([1, 2, 3]).toEqual([1, 2, 3]);

// Negation
expect(5).not.toBe(3);
expect('hello').not.toContain('x');
```

## Matchers

### Equality

```typescript
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality
expect(value).toStrictEqual(expected);  // Strict deep equality
```

### Truthiness

```typescript
expect(1).toBeTruthy();
expect(0).toBeFalsy();
expect(null).toBeNull();
expect(undefined).toBeUndefined();
expect('value').toBeDefined();
expect(NaN).toBeNaN();
```

### Numbers

```typescript
expect(10).toBeGreaterThan(5);
expect(10).toBeGreaterThanOrEqual(10);
expect(5).toBeLessThan(10);
expect(5).toBeLessThanOrEqual(5);
expect(0.1 + 0.2).toBeCloseTo(0.3);      // Floating point comparison
expect(3.14159).toBeCloseTo(3.14, 2);    // Custom precision
```

### Strings

```typescript
expect('hello world').toContain('world');
expect('hello world').toMatch(/world/);
expect('hello world').toMatch('world');  // Substring match
```

### Arrays

```typescript
expect([1, 2, 3]).toContain(2);
expect([1, 2, 3]).toHaveLength(3);
expect([{ id: 1 }, { id: 2 }]).toContainEqual({ id: 1 });
```

### Objects

```typescript
expect({ name: 'John', age: 30 }).toMatchObject({ name: 'John' });
expect({ name: 'John' }).toHaveProperty('name');
expect({ user: { id: 1 } }).toHaveProperty('user.id', 1);
expect(new Date()).toBeInstanceOf(Date);
```

### Errors

```typescript
expect(() => { throw new Error('oops'); }).toThrow();
expect(() => { throw new Error('oops'); }).toThrow('oops');
expect(() => { throw new Error('oops'); }).toThrow(/oops/);
expect(() => { throw new TypeError(); }).toThrow(TypeError);
```

## Promise Assertions

Assert on resolved or rejected promises using `.resolves` and `.rejects`:

```typescript
// Resolves
await expect(Promise.resolve(42)).resolves.toBe(42);
await expect(fetchData()).resolves.toHaveProperty('id');
await expect(asyncFn()).resolves.toEqual({ status: 'ok' });

// Rejects
await expect(Promise.reject(new Error('fail'))).rejects.toThrow('fail');
await expect(failingFn()).rejects.toBeInstanceOf(Error);
await expect(asyncFn()).rejects.toMatch(/error/);
```

All standard matchers are available on promise assertions:

```typescript
await expect(asyncFn()).resolves.toBeGreaterThan(0);
await expect(asyncFn()).resolves.toContain('value');
await expect(asyncFn()).resolves.toMatchObject({ key: 'value' });
```

## Asymmetric Matchers

Use asymmetric matchers for flexible partial matching:

```typescript
import {
  expect,
  any,
  anything,
  stringContaining,
  stringMatching,
  arrayContaining,
  objectContaining
} from '@embedunit/assert';

// Match any value (except null/undefined)
expect({ id: 123 }).toEqual({ id: anything() });

// Match by type
expect({ created: new Date() }).toEqual({ created: any(Date) });
expect({ name: 'test' }).toEqual({ name: any(String) });
expect({ count: 42 }).toEqual({ count: any(Number) });

// String matchers
expect({ msg: 'Hello world' }).toEqual({ msg: stringContaining('world') });
expect({ email: 'test@example.com' }).toEqual({ email: stringMatching(/@example/) });

// Array matchers
expect([1, 2, 3, 4]).toEqual(arrayContaining([2, 4]));

// Object matchers
expect({ name: 'John', age: 30, city: 'NYC' }).toEqual(
  objectContaining({ name: 'John', age: 30 })
);
```

Asymmetric matchers work within nested structures:

```typescript
expect({
  user: { id: 123, name: 'John' },
  items: [1, 2, 3]
}).toEqual({
  user: objectContaining({ id: any(Number) }),
  items: arrayContaining([2])
});
```

## Custom Messages

Provide custom error messages for better debugging:

```typescript
expect(result, 'User should be authenticated').toBeTruthy();
expect(response.status, 'API should return 200').toBe(200);
expect(items, 'Cart should not be empty').toHaveLength(3);
```

## Spy Assertions

When used with `@embedunit/spy`, additional matchers are available:

```typescript
import '@embedunit/spy';  // Enables spy assertions
import { mock } from '@embedunit/spy';

const fn = mock(() => 'result');
fn('arg1', 'arg2');

expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(1);
expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
expect(fn).toHaveReturnedWith('result');
```

## API Reference

### Matchers

| Matcher | Description |
|---------|-------------|
| `toBe(expected)` | Strict equality (`===`) |
| `toEqual(expected)` | Deep equality |
| `toStrictEqual(expected)` | Strict deep equality |
| `toBeTruthy()` | Value is truthy |
| `toBeFalsy()` | Value is falsy |
| `toBeNull()` | Value is `null` |
| `toBeUndefined()` | Value is `undefined` |
| `toBeDefined()` | Value is not `undefined` |
| `toBeNaN()` | Value is `NaN` |
| `toBeGreaterThan(n)` | Number comparison |
| `toBeGreaterThanOrEqual(n)` | Number comparison |
| `toBeLessThan(n)` | Number comparison |
| `toBeLessThanOrEqual(n)` | Number comparison |
| `toBeCloseTo(n, precision?)` | Floating point comparison |
| `toContain(item)` | Array/string contains |
| `toContainEqual(item)` | Array contains (deep equality) |
| `toHaveLength(n)` | Length check |
| `toMatch(pattern)` | Regex/string match |
| `toMatchObject(obj)` | Partial object match |
| `toHaveProperty(path, value?)` | Property existence/value |
| `toBeInstanceOf(Class)` | Instance check |
| `toThrow(matcher?)` | Function throws |

### Asymmetric Matchers

| Matcher | Description |
|---------|-------------|
| `anything()` | Matches any non-null/undefined value |
| `any(Constructor)` | Matches instances of constructor |
| `stringContaining(str)` | Matches strings containing substring |
| `stringMatching(pattern)` | Matches strings matching regex |
| `arrayContaining(arr)` | Matches arrays containing elements |
| `objectContaining(obj)` | Matches objects with properties |

## Related

- [embedunit](https://github.com/embedunit/embedunit) - Main repository
- [@embedunit/core](https://www.npmjs.com/package/@embedunit/core) - Test runner
- [@embedunit/spy](https://www.npmjs.com/package/@embedunit/spy) - Spy/mock utilities

## License

MIT
