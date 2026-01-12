# @embedunit/core

## 0.5.0

### Minor Changes

- [#4](https://github.com/embedunit/embedunit/pull/4) [`f604636`](https://github.com/embedunit/embedunit/commit/f6046361b393533e151432fc869985fac2f4807b) Thanks [@vuliad](https://github.com/vuliad)! - Extract source-map-js to @embedunit/plugins-sourcemap plugin.

  Source map support is now opt-in. To enable source map remapping:

  - Import the plugin: `import '@embedunit/plugins-sourcemap'`
  - Or use the new bundle: `embedunit.recommended.sourcemap.global.js`

  This reduces the core bundle size by ~29KB (minified).

## 0.4.0

### Minor Changes

- [`d29bb8d`](https://github.com/embedunit/embedunit/commit/d29bb8d18c8b9f1b463e765d52865756dc983ce4) Thanks [@vuliad](https://github.com/vuliad)! - Test OIDC trusted publishing with npm 11.5+

## 0.3.0

### Minor Changes

- [`fb7ac3b`](https://github.com/embedunit/embedunit/commit/fb7ac3b0d1c50d0e17614d0e18374c7dec41799f) Thanks [@vuliad](https://github.com/vuliad)! - Test OIDC trusted publishing flow

## 0.2.0

### Minor Changes

- [`de11ff4`](https://github.com/embedunit/embedunit/commit/de11ff449fb62c6cfcd63d2e69bd9956238e654f) Thanks [@vuliad](https://github.com/vuliad)! - Test OIDC npm publishing integration
