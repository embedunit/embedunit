---
"@embedunit/core": minor
"@embedunit/plugins-sourcemap": minor
"@embedunit/bundles": minor
---

Extract source-map-js to @embedunit/plugins-sourcemap plugin.

Source map support is now opt-in. To enable source map remapping:
- Import the plugin: `import '@embedunit/plugins-sourcemap'`
- Or use the new bundle: `embedunit.recommended.sourcemap.global.js`

This reduces the core bundle size by ~29KB (minified).
