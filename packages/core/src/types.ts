export type SafeError = {
  /** e.g. "TypeError" */
  name?: string;
  /** e.g. "Cannot read property 'to' of undefined" */
  message: string;
  /** first file path parsed from the stack, if any */
  file?: string;
  /** line number */
  line?: number;
  /** column number */
  column?: number;
  /** full stack split into lines */
  stack?: string[];
  /** Enhanced error context (for EnhancedTestError instances) */
  context?: TestErrorContext;
  /** Original error that was enhanced */
  originalError?: any;
  /** Full error string representation */
  toString?: () => string;
  /** JSON representation */
  toJSON?: () => any;
  /** Compact summary for reporting */
  getCompactSummary?: () => string;
};

export interface LogEntry {
  message: string;
  timestamp: number;
}

export interface TestErrorContext {
  logs: {
    console: LogEntry[];      // Console.log/warn/error during test
    framework: LogEntry[];    // Test framework internal logs
    game: LogEntry[];        // Game-specific events/logs
  };
  timing?: {
    start: number;          // Test start timestamp
    end?: number;           // Test end timestamp
    duration?: number;      // Test execution duration in ms
  };
  testPath?: {
    suite: string;          // Full suite path
    test: string;           // Test name
    file?: string;          // Source file (if available)
    line?: number;          // Source line (if available)
  };
  metadata?: {
    retryAttempt?: number;  // Current retry attempt
    totalAttempts?: number; // Total retry attempts
    tags?: string[];        // Test tags
    [key: string]: any;     // Additional metadata
  };
}

export type TestStatus = 'passed' | 'failed' | 'skipped';

export interface TestResult {
  suite: string; // Full suite path (e.g., "Outer > Middle")
  test: string;
  status: TestStatus;
  duration: number;
  error?: SafeError;
}

/**
 * Summary of test execution results
 */
export interface TestSummary {
  /** Total number of tests that ran */
  total: number;
  /** Number of tests that passed */
  passed: number;
  /** Number of tests that failed */
  failed: number;
  /** Number of tests that were skipped */
  skipped: number;
  /** Total execution time in milliseconds */
  duration: number;
  /** Whether any tests failed */
  success: boolean;
}

/**
 * Test execution results with summary and categorized tests
 */
export interface TestRunResult {
  /** Summary statistics */
  summary: TestSummary;
  /** Failed tests (always with error object, verboseErrors controls detail level) */
  failures: Array<{
    suite: string;
    test: string;
    error: SafeError; // Always an object, verboseErrors controls how much detail
    duration: number;
  }>;
  /** Passed tests (only included when includePassed is true) */
  passed?: Array<{
    suite: string;
    test: string;
    duration: number;
  }>;
  /** Skipped tests (only included when includeSkipped is true) */
  skipped?: Array<{
    suite: string;
    test: string;
  }>;
}

export type TestFn = () => void | Promise<void>;
export type HookFn = () => void | Promise<void>; // Renamed from Hook

// Represents a single test case within a describe block
export interface TestCase {
  name: string;
  fn: TestFn;
  tags: string[]; // Keep tags if you use them
  describeBlock: DescribeBlock; // Link back to its describe block
  skip?: boolean; // Mark test as skipped
  only?: boolean; // Mark test as focused (only run this)
  timeout?: number; // Custom timeout in milliseconds
}

// Represents a describe block (suite)
export interface DescribeBlock {
  name: string;
  parent: DescribeBlock | null; // Link to parent for inheritance
  children: DescribeBlock[]; // Nested describes
  tests: TestCase[]; // Tests defined directly in this block
  tags: string[]; // Tags defined on this suite (e.g., @unit, @slow)
  beforeAllHooks: HookFn[];
  beforeEachHooks: HookFn[];
  afterEachHooks: HookFn[];
  afterAllHooks: HookFn[];
  // --- State for runner ---
  ranBeforeAll: boolean; // Track if beforeAll has run for this scope
  // ranAfterAll: boolean; // Track if afterAll has run for this scope (handled slightly differently in runner)
  executed: boolean; // Track if the block was entered by the runner at all
  skip?: boolean; // Mark entire suite as skipped
  only?: boolean; // Mark entire suite as focused (only run this)
  timeout?: number; // Suite-level timeout that applies to all tests
}
