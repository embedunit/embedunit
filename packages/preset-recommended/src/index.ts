// Re-export everything from all packages
// Note: isSpy is exported from both assert and spy, we use spy's version
export * from '@embedunit/core';
export {
  deepEqual,
  getType,
  isThenable,
  diff,
  formatDiff,
  getDiffSummary,
  EnhancedAssertionError,
  createCustomError,
  createDiffError,
  filterStackTrace,
  formatAsyncError,
  formatErrorForContext,
  Assertion,
  expect,
  PromiseAssertion,
  stringifyValue,
  registerSpyIntegration,
  unregisterSpyIntegration,
  getCallCount,
  getCalls
} from '@embedunit/assert';
export type { DiffType, DiffEntry, DiffResult, DiffOptions, ErrorFormatOptions } from '@embedunit/assert';
export * from '@embedunit/spy';
export * from '@embedunit/reporters-minimal';
export { installGlobals, uninstallGlobals } from '@embedunit/globals';
export type { GlobalInstallOptions } from '@embedunit/globals';

// Import for default export composition
import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  xit,
  xdescribe,
  fit,
  fdescribe,
  runTests,
  getTestList,
  resetRegistry,
  setConfig,
  getConfig,
  resetConfig,
  withTimeout,
  maybeWithTimeout,
  TimeoutError,
  itIf,
  itSkipIf,
  describeIf,
  describeSkipIf,
  platform,
  env,
  formatTestName,
  parseTemplateTable,
  normalizeTableData,
  EnhancedTestError,
  createEnhancedError,
  isEnhancedTestError,
  TestLogCollector,
  testLogger,
  getCurrentTestLogCollector
} from '@embedunit/core';

import {
  expect,
  diff,
  formatDiff,
  getDiffSummary,
  EnhancedAssertionError,
  createCustomError,
  formatAsyncError
} from '@embedunit/assert';

import {
  spyOn,
  createSpyFunction,
  restoreAllSpies,
  spyOnAsync,
  createAsyncSpy,
  enhanceSpy,
  mock
} from '@embedunit/spy';

import {
  calculateSummary,
  formatSummary,
  generateTextReport,
  generateJsonReport,
  generateCompactSummary
} from '@embedunit/reporters-minimal';

import { installGlobals, uninstallGlobals } from '@embedunit/globals';

// Default export matching the original CCTestSuite API for backwards compatibility
export default {
  // Core DSL
  describe,
  it,
  expect,

  // Lifecycle hooks
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,

  // Skip/only modifiers
  xit,
  xdescribe,
  fit,
  fdescribe,

  // Mock/spy utilities
  mock,
  spy: {
    spyOn,
    createSpy: createSpyFunction,
    restoreAllSpies,
    spyOnAsync,
    createAsyncSpy,
    enhanceSpy
  },

  // Also expose spyOn at top level for convenience
  spyOn,

  // Timeout configuration
  timeout: {
    setConfig,
    getConfig,
    resetConfig,
    withTimeout,
    maybeWithTimeout,
    TimeoutError
  },

  // Conditional test helpers
  conditional: {
    itIf,
    itSkipIf,
    describeIf,
    describeSkipIf,
    platform,
    env
  },

  // Parameterized test helpers
  parameterized: {
    formatTestName,
    parseTemplateTable,
    normalizeTableData
  },

  // Error utilities
  error: {
    diff,
    formatDiff,
    getDiffSummary,
    EnhancedAssertionError,
    createCustomError,
    formatAsyncError,
    EnhancedTestError,
    createEnhancedError,
    isEnhancedTestError
  },

  // Logging utilities
  logging: {
    TestLogCollector,
    testLogger,
    getCurrentTestLogCollector
  },

  // Runner
  runner: {
    runTests,
    getTestList,
    resetRegistry
  },

  // Also expose runTests at top level
  runTests,
  getTestList,
  resetRegistry,

  // Reporter utilities
  reporter: {
    calculateSummary,
    formatSummary,
    generateTextReport,
    generateJsonReport,
    generateCompactSummary
  },

  // Globals installation
  globals: {
    installGlobals,
    uninstallGlobals
  }
};
