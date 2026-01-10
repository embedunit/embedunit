# @embedunit/spy

Spy and mock utilities for embedded JavaScript testing. Part of the [embedunit](https://github.com/user/embedunit) monorepo.

## Installation

```bash
npm install @embedunit/spy
```

## Basic Usage

### spyOn - Spy on Object Methods

```typescript
import { spyOn, restoreAllSpies } from '@embedunit/spy';

const api = {
  fetchData: () => 'real data'
};

// Create a spy on the method
const spy = spyOn(api, 'fetchData');

// By default, calls through to original
api.fetchData(); // 'real data'

// Mock the return value
spy.returnValue('mock data');
api.fetchData(); // 'mock data'

// Restore original method
spy.restore();
```

### createSpyFunction - Standalone Spy

```typescript
import { createSpyFunction } from '@embedunit/spy';

const callback = createSpyFunction('myCallback');
callback.returnValue('mocked');

someFunction(callback);

console.log(callback.callCount); // 1
console.log(callback.calls[0].args); // ['expected', 'args']
```

## Spy Control Methods

```typescript
const spy = spyOn(obj, 'method');

// Call through to original implementation (default)
spy.callThrough();

// Return a fixed value
spy.returnValue('fixed');

// Return values in sequence
spy.returnValues('first', 'second', 'third');

// Throw an error
spy.throwError(new Error('fail'));

// Use a fake implementation
spy.callFake((arg) => `faked: ${arg}`);
```

## Call Tracking

```typescript
const spy = spyOn(obj, 'method');
obj.method('a', 'b');
obj.method('c');

// Call count
spy.callCount;      // 2
spy.called;         // true
spy.notCalled;      // false
spy.calledOnce;     // false
spy.calledTwice;    // true

// Check specific calls
spy.calledWith('a', 'b');      // true
spy.neverCalledWith('x');      // true

// Access call details
spy.firstCall();   // { args: ['a', 'b'], returnValue, thisArg, timestamp }
spy.lastCall();    // { args: ['c'], ... }
spy.getCall(0);    // { args: ['a', 'b'], ... }
spy.calls;         // Array of all SpyCall objects
```

## Async Spies

For mocking async functions and sequential returns:

```typescript
import { createAsyncSpy, spyOnAsync } from '@embedunit/spy';

// Create standalone async spy
const asyncSpy = createAsyncSpy('fetchUser');

// Resolve with value
asyncSpy.resolvedValue({ id: 1, name: 'John' });
await asyncSpy(); // { id: 1, name: 'John' }

// Reject with error
asyncSpy.rejectedValue(new Error('Not found'));
await asyncSpy(); // throws Error('Not found')

// Sequential resolved values
asyncSpy.resolvedValueOnce('first');
asyncSpy.resolvedValueOnce('second');
await asyncSpy(); // 'first'
await asyncSpy(); // 'second'

// Spy on async method
const api = { fetch: async () => 'data' };
const spy = spyOnAsync(api, 'fetch');
spy.resolvedValue('mocked');
```

### Async Spy Methods

```typescript
// One-time return values
spy.returnValueOnce('once');
spy.returnValuesOnce('a', 'b', 'c');

// Async resolved/rejected
spy.resolvedValue(value);
spy.resolvedValueOnce(value);
spy.resolvedValues(v1, v2, v3);
spy.rejectedValue(error);
spy.rejectedValueOnce(error);
spy.rejectedValues(e1, e2);

// One-time fake
spy.callFakeOnce((arg) => `fake: ${arg}`);

// Clear methods
spy.clearCalls();        // Clear call history
spy.clearReturnValues(); // Clear queued returns
spy.clearAll();          // Clear everything
```

## Mock Functions

For argument-based stubbing:

```typescript
import { mock } from '@embedunit/spy';

// Create mock function
const fn = mock.mockFn<(x: number) => string>('myMock');

// Set return value
fn.mockReturnValue('default');

// Custom implementation
fn.mockImplementation((x) => `value: ${x}`);

// Argument-based stubbing
mock.when(fn(1)).thenReturn('one');
mock.when(fn(2)).thenReturn('two');
fn(1); // 'one'
fn(2); // 'two'

// Verify calls
mock.verify(fn).wasCalledWith(1);

// Reset
mock.reset(fn);
```

## Cleanup

```typescript
import { restoreAllSpies } from '@embedunit/spy';

// Restore all active spies at once
afterEach(() => {
  restoreAllSpies();
});

// Or restore individually
const spy = spyOn(obj, 'method');
spy.restore();

// Reset call history without restoring
spy.reset();
```

## Integration with @embedunit/assert

When imported, `@embedunit/spy` automatically registers with `@embedunit/assert` to enable spy assertions:

```typescript
import { expect } from '@embedunit/assert';
import '@embedunit/spy'; // Enables spy matchers

const spy = spyOn(obj, 'method');
obj.method('arg');

expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledTimes(1);
expect(spy).toHaveBeenCalledWith('arg');
```

## API Reference

### Exports

- `spyOn(object, method)` - Create spy on object method
- `createSpyFunction(name?, originalFn?)` - Create standalone spy
- `spyOnAsync(object, method)` - Create async spy on method
- `createAsyncSpy(name?, originalFn?)` - Create standalone async spy
- `enhanceSpy(spy)` - Add async capabilities to existing spy
- `mock` - Mock function utilities
- `restoreAllSpies()` - Restore all active spies
- `isSpy(value)` - Check if value is a spy

## License

MIT
