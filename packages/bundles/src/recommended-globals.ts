// Full bundle with globals auto-installed
import EmbedUnit from '@embedunit/preset-recommended';
import { installGlobals } from '@embedunit/globals';

// Install globals immediately (warn on collision)
installGlobals({ collisionPolicy: 'warn' });

// Export for module usage
export default EmbedUnit;

// Auto-install to globalThis.EmbedUnit
(globalThis as Record<string, unknown>).EmbedUnit = EmbedUnit;
