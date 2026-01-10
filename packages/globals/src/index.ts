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
  fdescribe
} from '@embedunit/core';
import { expect } from '@embedunit/assert';
import { spyOn, mock } from '@embedunit/spy';

/**
 * Available global names that can be installed.
 *
 * **Test structure:**
 * - `describe` - Define a test suite
 * - `it` - Define a test case
 * - `xdescribe` - Skip a test suite
 * - `xit` - Skip a test case
 * - `fdescribe` - Focus on a test suite (only run focused suites/tests)
 * - `fit` - Focus on a test case (only run focused suites/tests)
 *
 * **Lifecycle hooks:**
 * - `beforeAll` - Run once before all tests in a suite
 * - `beforeEach` - Run before each test in a suite
 * - `afterEach` - Run after each test in a suite
 * - `afterAll` - Run once after all tests in a suite
 *
 * **Assertions:**
 * - `expect` - Create assertions with chainable matchers
 *
 * **Spies and mocks:**
 * - `spyOn` - Spy on object methods
 * - `mock` - Create mock functions
 */
export type GlobalName =
  | 'describe'
  | 'it'
  | 'xdescribe'
  | 'xit'
  | 'fdescribe'
  | 'fit'
  | 'beforeAll'
  | 'beforeEach'
  | 'afterEach'
  | 'afterAll'
  | 'expect'
  | 'spyOn'
  | 'mock';

export interface GlobalInstallOptions {
  /**
   * What to do when a global already exists:
   * - 'error': Throw an error (default)
   * - 'warn': Log a warning but overwrite
   * - 'skip': Skip installing that global
   * - 'force': Silently overwrite
   */
  collisionPolicy?: 'error' | 'warn' | 'skip' | 'force';

  /**
   * Namespace to use instead of globals (e.g., 'embedunit')
   * If set, installs as globalThis.embedunit.describe instead of globalThis.describe
   */
  namespace?: string;

  /**
   * Which globals to install (default: all)
   *
   * @example
   * // Install only describe, it, and expect
   * installGlobals({ include: ['describe', 'it', 'expect'] });
   *
   * @example
   * // Install everything except focused test helpers
   * installGlobals({ include: ['describe', 'it', 'expect', 'beforeAll', 'beforeEach', 'afterEach', 'afterAll', 'spyOn', 'mock'] });
   */
  include?: Array<GlobalName>;
}

const GLOBALS_MAP: Record<string, unknown> = {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  xit,
  xdescribe,
  fit,
  fdescribe,
  spyOn,
  mock
};

let installedGlobals: string[] = [];
let previousValues: Map<string, unknown> = new Map();

export function installGlobals(options: GlobalInstallOptions = {}): void {
  const { collisionPolicy = 'error', namespace, include } = options;
  const target = namespace
    ? ((globalThis as Record<string, unknown>)[namespace] = {} as Record<string, unknown>)
    : (globalThis as Record<string, unknown>);

  const toInstall = include
    ? Object.fromEntries(Object.entries(GLOBALS_MAP).filter(([k]) => include.includes(k as GlobalInstallOptions['include'] extends Array<infer T> ? T : never)))
    : GLOBALS_MAP;

  for (const [name, value] of Object.entries(toInstall)) {
    if (target[name] !== undefined) {
      switch (collisionPolicy) {
        case 'error':
          throw new Error(`Global '${name}' already exists. Use collisionPolicy option to handle.`);
        case 'warn':
          console.warn(`[embedunit] Overwriting existing global '${name}'`);
          previousValues.set(namespace ? `${namespace}.${name}` : name, target[name]);
          break;
        case 'skip':
          continue;
        case 'force':
          previousValues.set(namespace ? `${namespace}.${name}` : name, target[name]);
          break;
      }
    }
    target[name] = value;
    installedGlobals.push(namespace ? `${namespace}.${name}` : name);
  }
}

export function uninstallGlobals(namespace?: string): void {
  const target = namespace
    ? (globalThis as Record<string, unknown>)[namespace] as Record<string, unknown> | undefined
    : (globalThis as Record<string, unknown>);

  if (!target) return;

  for (const name of Object.keys(GLOBALS_MAP)) {
    const key = namespace ? `${namespace}.${name}` : name;
    if (previousValues.has(key)) {
      target[name] = previousValues.get(key);
      previousValues.delete(key);
    } else {
      delete target[name];
    }
  }

  if (namespace) {
    delete (globalThis as Record<string, unknown>)[namespace];
  }

  installedGlobals = [];
}

// Re-export everything for direct imports
export * from '@embedunit/core';
export { expect } from '@embedunit/assert';
export { spyOn, mock, createSpyFunction, restoreAllSpies } from '@embedunit/spy';
