# @embedunit/reporters-minimal

Minimal console/callback reporter for [embedunit](https://github.com/embedunit/embedunit). Provides utilities for summarizing and formatting test results.

## Installation

```bash
npm install @embedunit/reporters-minimal
```

## API

| Function | Description |
|----------|-------------|
| `calculateSummary(results)` | Calculate summary stats from test results |
| `generateTextReport(results)` | Generate detailed multi-line text report |
| `generateCompactSummary(results)` | Generate one-line summary with emoji |
| `generateJsonReport(results)` | Generate JSON report string |
| `formatSummary(summary)` | Format a summary object as text |

## Usage

```typescript
import { runTests } from '@embedunit/core';
import {
  calculateSummary,
  generateTextReport,
  generateCompactSummary,
  generateJsonReport
} from '@embedunit/reporters-minimal';

// Run tests and get results
const results = await runTests();

// Calculate summary
const summary = calculateSummary(results);
console.log(summary);
// { total: 5, passed: 4, failed: 1, skipped: 0, duration: 42.5, success: false, passRate: 80 }

// Generate compact one-liner
console.log(generateCompactSummary(results));
// "Ran 5 test(s). 4 passed, 1 failed."

// Generate detailed text report
console.log(generateTextReport(results));

// Generate JSON for CI/tooling
const json = generateJsonReport(results);

// Compact JSON for size-constrained environments
const compact = generateJsonReport(results, { compact: true });
```

## Options

Functions accept an optional `ReporterOptions` object:

```typescript
interface ReporterOptions {
  useEmoji?: boolean;  // default: true - use emoji or text ([PASS]/[FAIL])
  compact?: boolean;   // default: false - minified single-line JSON
}

// Examples:
generateTextReport(results, { useEmoji: false });
generateCompactSummary(results, { useEmoji: false });
generateJsonReport(results, { compact: true });
```

## Output Examples

**Compact Summary:**
```
Ran 5 test(s). 4 passed, 1 failed.
```

**Text Report:**
```
Test Results
============

Ran 5 test(s). 4 passed, 1 failed.
Duration: 42.50ms
Pass Rate: 80.0%

Failed Tests:
-------------
  MyModule > should handle edge case
     Expected 2 but got 3
```

**JSON Report:**
```json
{
  "summary": {
    "total": 5, "passed": 4, "failed": 1, "skipped": 0,
    "duration": 42.5, "success": false, "passRate": 80
  },
  "results": [...]
}
```

## Why No TAP or YAML?

TAP and YAML are intentionally not included:

- **TAP**: Embedded runtimes don't integrate with TAP harnesses
- **YAML**: Requires a parser library; JSON is native to all JS runtimes

JSON with `compact: true` provides efficient machine-readable output without dependencies. YAML may be added as a separate `@embedunit/reporters-yaml` package if needed.

## License

MIT - See [main repository](https://github.com/embedunit/embedunit) for details.
