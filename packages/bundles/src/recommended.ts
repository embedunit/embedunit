// Full bundle with all features
import EmbedUnit from '@embedunit/preset-recommended';
import { installGlobals, uninstallGlobals } from '@embedunit/globals';

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
