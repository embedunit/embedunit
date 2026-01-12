# @embedunit/plugins-sourcemap

## 0.5.0

### Minor Changes

- [#4](https://github.com/embedunit/embedunit/pull/4) [`f604636`](https://github.com/embedunit/embedunit/commit/f6046361b393533e151432fc869985fac2f4807b) Thanks [@vuliad](https://github.com/vuliad)! - Extract source-map-js to @embedunit/plugins-sourcemap plugin.

  Source map support is now opt-in. To enable source map remapping:

  - Import the plugin: `import '@embedunit/plugins-sourcemap'`
  - Or use the new bundle: `embedunit.recommended.sourcemap.global.js`

  This reduces the core bundle size by ~29KB (minified).

### Patch Changes

- Updated dependencies [[`f604636`](https://github.com/embedunit/embedunit/commit/f6046361b393533e151432fc869985fac2f4807b)]:
  - @embedunit/core@0.5.0
