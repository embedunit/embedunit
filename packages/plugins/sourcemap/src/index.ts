import { setErrorRemapper } from '@embedunit/core';
import { remapPosition, remapBrowserStack, clearSourceMapCache } from './remapper';

// Auto-register source map remapper on import
setErrorRemapper(remapPosition);

// Export for manual use
export { remapPosition, remapBrowserStack, clearSourceMapCache };
export type { Frame } from '@embedunit/core';
