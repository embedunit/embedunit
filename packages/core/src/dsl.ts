// src/dsl.ts
import { DescribeBlock, TestCase, HookFn, TestFn } from './types';
import { createEachFunction, createDescribeEachFunction, TableData } from './parameterized';

// Root of the describe tree
export const rootDescribeBlock: DescribeBlock = createDescribeBlock('Root', null);

// Pointer to the currently active describe block during test file parsing
let currentDescribeBlock: DescribeBlock = rootDescribeBlock;

function createDescribeBlock(name: string, parent: DescribeBlock | null): DescribeBlock {
  return {
    name,
    parent,
    children: [],
    tests: [],
    tags: [], // Initialize empty tags array
    beforeAllHooks: [],
    beforeEachHooks: [],
    afterEachHooks: [],
    afterAllHooks: [],
    ranBeforeAll: false,
    executed: false, // Initialize executed state
  };
}

function extractTags(name: string): { clean: string, tags: string[] } {
  const tagPattern = /@[\w\-.:]+/g;
  const tags: string[] = [];
  const clean = name.replace(tagPattern, (match) => {
    tags.push(match.slice(1)); // remove @
    return '';
  }).trim();
  return { clean, tags };
}

// --- Public DSL Functions ---

/**
 * Creates a test suite that groups related tests together.
 *
 * @param name - The name of the test suite
 * @param fn - A function containing test cases and nested suites
 * @param timeout - Optional timeout in milliseconds for all tests in this suite
 *
 * @example
 * ```typescript
 * describe('Calculator', () => {
 *   it('should add numbers', () => {
 *     expect(1 + 2).toBe(3);
 *   });
 * });
 * ```
 */
export function describe(name: string, fn: () => void, timeout?: number): void {
  _describe(name, fn, false, false, timeout);
}

// Internal describe implementation with skip/only support
function _describe(name: string, fn: () => void, skip: boolean, only: boolean, timeout?: number): void {
  const parent = currentDescribeBlock;
  const { clean: blockName, tags: blockTags } = extractTags(name);
  const newBlock = createDescribeBlock(blockName, parent);
  newBlock.tags = blockTags; // Store the extracted tags
  newBlock.skip = skip;
  newBlock.only = only;
  newBlock.timeout = timeout;
  parent.children.push(newBlock);

  // Set context for nested calls
  currentDescribeBlock = newBlock;
  try {
    fn(); // Execute the describe body to register its contents
  } finally {
    // Restore context
    currentDescribeBlock = parent;
  }
}

/**
 * Skips a test suite and all its tests.
 * Tests in skipped suites will not be executed.
 *
 * @param name - The name of the test suite to skip
 * @param fn - The suite function (will not be executed)
 * @param timeout - Optional timeout in milliseconds
 *
 * @example
 * ```typescript
 * describe.skip('Broken feature', () => {
 *   it('test that would fail', () => { ... });
 * });
 * ```
 */
describe.skip = function(name: string, fn: () => void, timeout?: number): void {
  _describe(name, fn, true, false, timeout);
};

/**
 * Focuses on a specific test suite, running only this suite and other focused tests.
 * When any test or suite is focused, only focused items will run.
 *
 * @param name - The name of the test suite to focus on
 * @param fn - The suite function containing tests
 * @param timeout - Optional timeout in milliseconds
 *
 * @example
 * ```typescript
 * describe.only('Critical feature', () => {
 *   it('must pass', () => { ... });
 * });
 * ```
 */
describe.only = function(name: string, fn: () => void, timeout?: number): void {
  _describe(name, fn, false, true, timeout);
};

/**
 * Creates parameterized test suites that run with different data sets.
 * Supports arrays, objects, and template literal tables.
 *
 * @param table - Test data as array of arrays, array of objects, or template literal
 * @returns A function to define the parameterized suite
 *
 * @example
 * ```typescript
 * describe.each([
 *   [1, 2, 3],
 *   [2, 3, 5]
 * ])('Calculator %d + %d = %d', (a, b, expected) => {
 *   it('adds correctly', () => {
 *     expect(a + b).toBe(expected);
 *   });
 * });
 * ```
 */
describe.each = function(table: TableData) {
  return createDescribeEachFunction(table, _describe);
};

/**
 * Defines a test case within a test suite.
 *
 * @param name - The name of the test
 * @param fn - The test function containing assertions
 * @param timeout - Optional timeout in milliseconds for this test
 *
 * @example
 * ```typescript
 * it('should calculate the sum', () => {
 *   expect(add(2, 3)).toBe(5);
 * });
 *
 * // Async test
 * it('should fetch data', async () => {
 *   const data = await fetchData();
 *   expect(data).toBeDefined();
 * });
 * ```
 */
export function it(name: string, fn: TestFn, timeout?: number): void {
  _it(name, fn, false, false, timeout);
}

// Internal it implementation with skip/only support
function _it(name: string, fn: TestFn, skip: boolean, only: boolean, timeout?: number): void {
  if (!currentDescribeBlock) {
    throw new Error("Cannot call 'it' outside of a 'describe' block (or globally if supported).");
  }
  const { clean: testName, tags: testTags } = extractTags(name);

  // Collect tags from all parent describe blocks
  const inheritedTags: string[] = [];
  let parent: DescribeBlock | null = currentDescribeBlock;
  while (parent) {
    inheritedTags.push(...parent.tags);
    parent = parent.parent;
  }

  // Combine test's own tags with inherited tags (removing duplicates)
  const allTags = [...new Set([...testTags, ...inheritedTags])];

  const testCase: TestCase = {
    name: testName,
    fn,
    tags: allTags, // Combined tags from test and all parent suites
    describeBlock: currentDescribeBlock,
    skip,
    only,
    timeout,
  };
  currentDescribeBlock.tests.push(testCase);
}

/**
 * Skips a test case. The test will not be executed but will be reported as skipped.
 *
 * @param name - The name of the test to skip
 * @param fn - The test function (will not be executed)
 * @param timeout - Optional timeout in milliseconds
 *
 * @example
 * ```typescript
 * it.skip('test under development', () => {
 *   // This test won't run
 * });
 * ```
 */
it.skip = function(name: string, fn: TestFn, timeout?: number): void {
  _it(name, fn, true, false, timeout);
};

/**
 * Focuses on a specific test, running only this test and other focused tests.
 * Useful for debugging a specific test.
 *
 * @param name - The name of the test to focus on
 * @param fn - The test function to execute
 * @param timeout - Optional timeout in milliseconds
 *
 * @example
 * ```typescript
 * it.only('critical test', () => {
 *   expect(criticalFunction()).toBe(true);
 * });
 * ```
 */
it.only = function(name: string, fn: TestFn, timeout?: number): void {
  _it(name, fn, false, true, timeout);
};

/**
 * Creates parameterized tests that run with different data sets.
 * Each row in the table creates a separate test.
 *
 * @param table - Test data as array of arrays, array of objects, or template literal
 * @returns A function to define the parameterized test
 *
 * @example
 * ```typescript
 * it.each([
 *   [1, 1, 2],
 *   [1, 2, 3],
 *   [2, 2, 4]
 * ])('adds %d + %d to equal %d', (a, b, expected) => {
 *   expect(a + b).toBe(expected);
 * });
 * ```
 */
it.each = function(table: TableData) {
  return createEachFunction(table, _it);
};

/**
 * Registers a setup function that runs once before all tests in the current suite.
 * Useful for expensive setup operations that can be shared across tests.
 *
 * @param fn - Setup function to run before all tests
 *
 * @example
 * ```typescript
 * describe('Database tests', () => {
 *   let db;
 *
 *   beforeAll(async () => {
 *     db = await connectToDatabase();
 *   });
 *
 *   afterAll(async () => {
 *     await db.close();
 *   });
 * });
 * ```
 */
export function beforeAll(fn: HookFn): void {
  if (!currentDescribeBlock) throw new Error("Cannot call 'beforeAll' outside of a 'describe' block.");
  currentDescribeBlock.beforeAllHooks.push(fn);
}

/**
 * Registers a setup function that runs before each test in the current suite.
 * Useful for resetting state between tests.
 *
 * @param fn - Setup function to run before each test
 *
 * @example
 * ```typescript
 * describe('User service', () => {
 *   let user;
 *
 *   beforeEach(() => {
 *     user = createTestUser();
 *   });
 *
 *   it('should update user', () => {
 *     user.name = 'New Name';
 *     expect(user.name).toBe('New Name');
 *   });
 * });
 * ```
 */
export function beforeEach(fn: HookFn): void {
  if (!currentDescribeBlock) throw new Error("Cannot call 'beforeEach' outside of a 'describe' block.");
  currentDescribeBlock.beforeEachHooks.push(fn);
}

/**
 * Registers a cleanup function that runs after each test in the current suite.
 * Useful for cleaning up test side effects.
 *
 * @param fn - Cleanup function to run after each test
 *
 * @example
 * ```typescript
 * describe('File operations', () => {
 *   afterEach(() => {
 *     // Clean up any test files created
 *     cleanupTestFiles();
 *   });
 *
 *   it('should create a file', () => {
 *     createFile('test.txt');
 *     expect(fileExists('test.txt')).toBe(true);
 *   });
 * });
 * ```
 */
export function afterEach(fn: HookFn): void {
  if (!currentDescribeBlock) throw new Error("Cannot call 'afterEach' outside of a 'describe' block.");
  currentDescribeBlock.afterEachHooks.push(fn);
}

/**
 * Registers a cleanup function that runs once after all tests in the current suite.
 * Useful for cleaning up resources created in beforeAll.
 *
 * @param fn - Cleanup function to run after all tests
 *
 * @example
 * ```typescript
 * describe('WebSocket tests', () => {
 *   let server;
 *
 *   beforeAll(async () => {
 *     server = await startWebSocketServer();
 *   });
 *
 *   afterAll(async () => {
 *     await server.close();
 *   });
 * });
 * ```
 */
export function afterAll(fn: HookFn): void {
  if (!currentDescribeBlock) throw new Error("Cannot call 'afterAll' outside of a 'describe' block.");
  currentDescribeBlock.afterAllHooks.push(fn);
}

/**
 * Alias for it.skip - marks a test as skipped.
 * @see {@link it.skip}
 */
export const xit = it.skip;

/**
 * Alias for describe.skip - marks a test suite as skipped.
 * @see {@link describe.skip}
 */
export const xdescribe = describe.skip;

/**
 * Alias for it.only - focuses on a single test.
 * @see {@link it.only}
 */
export const fit = it.only;

/**
 * Alias for describe.only - focuses on a single test suite.
 * @see {@link describe.only}
 */
export const fdescribe = describe.only;

/**
 * Alias for `it` - defines a test case.
 * This is the Jest/Vitest-style naming convention.
 *
 * @param name - The name of the test
 * @param fn - The test function containing assertions
 * @param timeout - Optional timeout in milliseconds
 *
 * @example
 * ```typescript
 * test('should add numbers', () => {
 *   expect(1 + 2).toBe(3);
 * });
 * ```
 */
export function test(name: string, fn: TestFn, timeout?: number): void {
  _it(name, fn, false, false, timeout);
}

/**
 * Skips a test case.
 * @see {@link it.skip}
 */
test.skip = function(name: string, fn: TestFn, timeout?: number): void {
  _it(name, fn, true, false, timeout);
};

/**
 * Focuses on a specific test.
 * @see {@link it.only}
 */
test.only = function(name: string, fn: TestFn, timeout?: number): void {
  _it(name, fn, false, true, timeout);
};

/**
 * Creates parameterized tests.
 * @see {@link it.each}
 */
test.each = function(table: TableData) {
  return createEachFunction(table, _it);
};

/**
 * Alias for test.skip
 */
export const xtest = test.skip;

// --- Helper Functions for Runner (Exported for runner.ts) ---

/**
 * Gets the full path of a test suite for reporting.
 * @internal
 */
export function getSuitePath(block: DescribeBlock): string {
  const path: string[] = [];
  let current: DescribeBlock | null = block;
  while (current && current.parent) { // Stop before adding Root
    path.unshift(current.name);
    current = current.parent;
  }
  return path.join(' > ');
}

/**
 * Collects hooks from a describe block and its parents.
 * @internal
 */
export function collectHooks(block: DescribeBlock, type: 'beforeAll' | 'beforeEach' | 'afterEach' | 'afterAll'): HookFn[] {
  const hooks: HookFn[] = [];
  let current: DescribeBlock | null = block;
  const blockChain: DescribeBlock[] = [];

  // Walk up to root
  while (current) {
    blockChain.push(current);
    current = current.parent;
  }

  // Order depends on hook type
  if (type === 'beforeAll' || type === 'beforeEach') {
    // Outermost first (root is last in blockChain)
    for (let i = blockChain.length - 1; i >= 0; i--) {
      hooks.push(...blockChain[i][`${type}Hooks`]);
    }
  } else { // afterEach or afterAll
    // Innermost first (current block is first in blockChain)
    for (let i = 0; i < blockChain.length; i++) {
      hooks.push(...blockChain[i][`${type}Hooks`]);
    }
  }
  return hooks;
}


// Execute hooks sequentially, awaiting promises
export async function runHooks(hooks: HookFn[], hookType: string, context: string): Promise<{ success: boolean, error?: unknown }> {
  for (const hook of hooks) {
    try {
      await hook();
    } catch (error) {
      console.error(`Error in ${hookType} hook for ${context}:`, error);
      return { success: false, error };
    }
  }
  return { success: true };
}

/**
 * Resets the test registry for a new test run.
 * Clears all registered tests and suites.
 * @internal
 */
export function resetRegistry(): void {
  function resetBlock(block: DescribeBlock) {
    block.children = [];
    block.tests = [];
    block.beforeAllHooks = [];
    block.beforeEachHooks = [];
    block.afterEachHooks = [];
    block.afterAllHooks = [];
    block.ranBeforeAll = false;
    block.executed = false;
  }
  resetBlock(rootDescribeBlock);
  currentDescribeBlock = rootDescribeBlock;
}

// Re-export runTests from runner - will be defined in runner.ts
// We do this here to keep the public API consolidated if desired
// This creates a circular dependency at module load time, which is usually fine
// for functions but can be tricky. We'll import runner dynamically inside runTests caller if needed,
// or structure exports carefully. For now, let's assume runner.ts imports dsl.ts.
// We will export runTests from runner.ts directly later.
