# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm clean            # Clean all dist folders
pnpm --filter @embedunit/core build   # Build specific package
```

## Package Dependencies

Build order matters due to these dependencies:

```
@embedunit/core (no deps)
@embedunit/assert (no deps)
    ↓
@embedunit/spy (depends on assert)
@embedunit/reporters-minimal (depends on core)
    ↓
@embedunit/globals (depends on core, assert, spy)
    ↓
@embedunit/preset-recommended (depends on all above)
    ↓
@embedunit/bundles (depends on preset-recommended)
```

## Build Outputs

**Library packages** (core, assert, spy, globals, reporters-minimal, preset-recommended):
- `dist/index.js` - ESM
- `dist/index.cjs` - CommonJS
- `dist/index.d.ts` - TypeScript declarations

**Bundles package**:
- `dist/embedunit.recommended.global.js` - Full IIFE bundle
- `dist/embedunit.lite.global.js` - Minimal bundle (core + assert)
- All have `.min.js` versions

## Git Workflow

- **Code changes** (features, fixes) must go through pull requests
- **Chore commits** (CI, docs, configs) can go directly to main
- The release workflow runs on push to main and handles versioning via changesets

## Development Guidelines

- Each package has `src/index.ts` as entry point
- Use `"workspace:*"` for internal dependencies
- Tests are in `packages/*/test/`
- Shared rollup configs are in `rollup/`
- Spy package auto-registers with assert on import
