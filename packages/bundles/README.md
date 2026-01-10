# @embedunit/bundles

IIFE bundles for using EmbedUnit via `<script>` tags in embedded JavaScript runtimes.

## Bundle Variants

| Bundle | Description | Approx. Size |
|--------|-------------|--------------|
| `embedunit.lite.global.js` | Core + Assert only | ~15 KB |
| `embedunit.lite.global.min.js` | Minified lite bundle | ~6 KB |
| `embedunit.recommended.global.js` | All packages | ~25 KB |
| `embedunit.recommended.global.min.js` | Minified full bundle | ~10 KB |
| `embedunit.recommended.globals.js` | All packages + auto-installs globals | ~25 KB |
| `embedunit.recommended.globals.min.js` | Minified with auto globals | ~10 KB |

## Usage

### Basic Usage

```html
<script src="embedunit.recommended.global.min.js"></script>
<script>
  const { describe, it, expect, runTests } = EmbedUnit;

  describe('Math', () => {
    it('adds numbers', () => {
      expect(1 + 2).toBe(3);
    });

    it('multiplies numbers', () => {
      expect(3 * 4).toBe(12);
    });
  });

  runTests().then(results => {
    console.log('Tests complete:', results);
  });
</script>
```

### With Auto-Installed Globals

The `globals` variant automatically installs `describe`, `it`, `expect`, etc. to `globalThis`:

```html
<script src="embedunit.recommended.globals.min.js"></script>
<script>
  // No destructuring needed - globals are available directly
  describe('Auto Globals', () => {
    it('works without destructuring', () => {
      expect(true).toBe(true);
    });
  });

  EmbedUnit.runTests();
</script>
```

### Lite Bundle (Minimal)

For size-constrained environments, the lite bundle includes only core functionality and assertions:

```html
<script src="embedunit.lite.global.min.js"></script>
<script>
  const { describe, it, expect, runTests } = EmbedUnit;

  describe('Lite', () => {
    it('has core and assertions', () => {
      expect([1, 2, 3]).toContain(2);
    });
  });

  runTests();
</script>
```

Note: The lite bundle does not include spies, mocks, or reporters.

## What's Included

| Feature | Lite | Recommended |
|---------|------|-------------|
| `describe`, `it`, `beforeEach`, etc. | Yes | Yes |
| `expect` with matchers | Yes | Yes |
| Async test support | Yes | Yes |
| Spies and mocks | No | Yes |
| Reporters | No | Yes |

## Integration

These bundles are designed for embedded JavaScript runtimes where npm/ESM imports are not available:

- Game engines (Unity, Unreal, Godot with JS)
- Custom JavaScript engines
- Simulation environments
- Legacy browser environments

## Links

- [Main Repository](https://github.com/nicksrandall/embedunit)
- [@embedunit/preset-recommended](../preset-recommended) - ESM/CJS equivalent
