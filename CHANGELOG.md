# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-10

### Added

- Initial monorepo structure with pnpm workspaces
- **@embedunit/core**: Test DSL (describe, it, hooks), runner, parameterized tests, timeouts, log collector, enhanced errors
- **@embedunit/assert**: Jest-style assertions, promise assertions, diff utilities
- **@embedunit/spy**: Function spies, async spies, mock utilities
- **@embedunit/globals**: Optional global installation with collision detection
- **@embedunit/reporters-minimal**: Console/callback reporters
- **@embedunit/preset-recommended**: All-in-one convenience package
- **@embedunit/bundles**: IIFE bundles for embedded runtimes
- Skip/only support (`.skip`, `.only`, `xit`, `xdescribe`, `fit`, `fdescribe`)
- Suite-level tags with inheritance and filtering
- Enhanced error context with source map support
