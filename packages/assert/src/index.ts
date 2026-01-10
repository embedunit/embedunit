// Core utilities
export { deepEqual, getType, isThenable } from './deepEqual';
export { diff, formatDiff, getDiffSummary } from './diff';
export type { DiffType, DiffEntry, DiffResult, DiffOptions } from './diff';

// Asymmetric matchers
export {
    anything,
    any,
    stringContaining,
    stringMatching,
    arrayContaining,
    objectContaining,
    isAsymmetricMatcher,
    deepEqualAsymmetric,
    ASYMMETRIC_MATCHER_SYMBOL
} from './asymmetric-matchers';
export type { AsymmetricMatcher } from './asymmetric-matchers';

// Error formatting
export {
  EnhancedAssertionError,
  createCustomError,
  createDiffError,
  filterStackTrace,
  formatAsyncError,
  formatErrorForContext
} from './error-format';
export type { ErrorFormatOptions } from './error-format';

// Assertion
export { Assertion, expect } from './assertion';
export { PromiseAssertion } from './promise-assertion';

// Utilities
export { stringifyValue } from './assertion-utils';

// Spy integration hook (for @embedunit/spy to register)
export { registerSpyIntegration, unregisterSpyIntegration, isSpy, getCallCount, getCalls } from './spy-integration';
