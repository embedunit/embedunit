---
"@embedunit/core": patch
---

Initial release of embedunit - a tiny, dependency-free test runner for embedded JavaScript runtimes.

Features:
- Suite/test registration with describe/it
- Async test support
- beforeAll/afterAll/beforeEach/afterEach hooks
- Skip (xit) and focus (fit) support
- Jest-style assertions (toBe, toEqual, toContain, toThrow, etc.)
- Spy/stub/mock primitives
- Optional global installation
- IIFE bundles for embedded runtimes (QuickJS, Hermes, etc.)
