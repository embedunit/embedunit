import { registerSpyIntegration } from '@embedunit/assert';
import { isSpy as isSpyInternal, Spy } from './spy';

// Type for casting - Spy requires a function type constraint
type AnySpy = Spy<(...args: unknown[]) => unknown>;

// Auto-register spy integration with assert package
registerSpyIntegration({
  isSpy: isSpyInternal,
  getCallCount: (value: unknown) => {
    if (!isSpyInternal(value)) return 0;
    return (value as AnySpy).callCount;
  },
  getCalls: (value: unknown) => {
    if (!isSpyInternal(value)) return [];
    return (value as AnySpy).calls;
  }
});

// Core spy exports
export { spyOn, createSpyFunction, restoreAllSpies, isSpy } from './spy';
export type { Spy, SpyCall } from './spy';

// Async spy exports
export { spyOnAsync, createAsyncSpy, enhanceSpy } from './spy-async';
export type { AsyncSpy } from './spy-async';

// Mock exports
export { mock } from './mock';
export type { MockFn } from './mock';
