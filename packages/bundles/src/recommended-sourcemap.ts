// Full bundle with all features + source map support
import EmbedUnit from '@embedunit/preset-recommended';
import { installGlobals, uninstallGlobals } from '@embedunit/globals';

// Import sourcemap plugin - auto-registers remapper on import
import '@embedunit/plugins-sourcemap';

// Add globals functions to EmbedUnit object
const EmbedUnitWithGlobals = {
  ...EmbedUnit,
  installGlobals,
  uninstallGlobals
};

// Export for module usage
export default EmbedUnitWithGlobals;

// Auto-install to globalThis.EmbedUnit
(globalThis as Record<string, unknown>).EmbedUnit = EmbedUnitWithGlobals;
