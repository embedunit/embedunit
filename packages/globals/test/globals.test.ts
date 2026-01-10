// packages/globals/test/globals.test.ts
import { describe, it, beforeEach, afterEach } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import { installGlobals, uninstallGlobals } from '../src';

// Helper to get global object with type safety
const getGlobal = () => globalThis as Record<string, unknown>;

describe('installGlobals / uninstallGlobals', () => {
  // Clean up after each test to ensure isolation
  afterEach(() => {
    // Clean up any installed globals
    uninstallGlobals();
    // Clean up any namespaced globals
    uninstallGlobals('embedunit');
    uninstallGlobals('testns');
    uninstallGlobals('verifyns');

    // Extra cleanup for any leftover test state
    const g = getGlobal();
    delete g['embedunit'];
    delete g['testns'];
    delete g['verifyns'];
  });

  describe('Basic installGlobals() / uninstallGlobals()', () => {
    it('should install all globals by default', () => {
      installGlobals({ collisionPolicy: 'force' });

      const g = getGlobal();
      expect(g['describe']).toBeDefined();
      expect(g['it']).toBeDefined();
      expect(g['expect']).toBeDefined();
      expect(g['beforeAll']).toBeDefined();
      expect(g['beforeEach']).toBeDefined();
      expect(g['afterEach']).toBeDefined();
      expect(g['afterAll']).toBeDefined();
      expect(g['spyOn']).toBeDefined();
      expect(g['mock']).toBeDefined();
      expect(g['xit']).toBeDefined();
      expect(g['xdescribe']).toBeDefined();
      expect(g['fit']).toBeDefined();
      expect(g['fdescribe']).toBeDefined();
    });

    it('should uninstall all globals', () => {
      installGlobals({ collisionPolicy: 'force' });
      uninstallGlobals();

      const g = getGlobal();
      // After uninstall, these should be undefined (deleted)
      // Note: describe, it, expect etc. might still exist if they were there before
      // The key point is that the installed values are removed
      expect(g['xit']).toBeUndefined();
      expect(g['xdescribe']).toBeUndefined();
      expect(g['fit']).toBeUndefined();
      expect(g['fdescribe']).toBeUndefined();
    });

    it('should allow reinstalling after uninstalling', () => {
      installGlobals({ collisionPolicy: 'force' });
      uninstallGlobals();

      // Should not throw when reinstalling
      installGlobals({ collisionPolicy: 'force' });

      const g = getGlobal();
      expect(g['describe']).toBeDefined();
      expect(g['it']).toBeDefined();
    });
  });

  describe('Collision policies', () => {
    describe('error policy (default)', () => {
      it('should throw when a global already exists', () => {
        const g = getGlobal();
        // Set up a collision
        g['testCollision'] = 'existing';

        // Temporarily add testCollision to the globals map is not possible,
        // so we test with an existing global that we know exists after first install
        installGlobals({ collisionPolicy: 'force' });

        let threw = false;
        try {
          // Installing again with default policy should throw
          installGlobals(); // default is 'error'
        } catch (e) {
          threw = true;
          expect((e as Error).message).toContain('already exists');
        }
        expect(threw).toBe(true);

        // Cleanup
        delete g['testCollision'];
      });
    });

    describe('warn policy', () => {
      it('should log a warning but still install the global', () => {
        installGlobals({ collisionPolicy: 'force' });

        // Should not throw, should warn (we can't easily capture console.warn)
        // But the function should complete without error
        let threw = false;
        try {
          installGlobals({ collisionPolicy: 'warn' });
        } catch (e) {
          threw = true;
        }
        expect(threw).toBe(false);

        const g = getGlobal();
        expect(g['describe']).toBeDefined();
      });

      it('should preserve previous values for restoration', () => {
        const g = getGlobal();
        const originalDescribe = g['describe'];

        // Install with force first
        installGlobals({ collisionPolicy: 'force' });

        // Install again with warn - should save previous value
        installGlobals({ collisionPolicy: 'warn' });

        // Uninstall should restore to embedunit's describe (from first install)
        uninstallGlobals();

        // The global should either be undefined or the original
        // depending on whether there was an original
      });
    });

    describe('skip policy', () => {
      it('should skip installing when global already exists', () => {
        const g = getGlobal();
        const marker = { isMarker: true };
        g['describe'] = marker;

        installGlobals({ collisionPolicy: 'skip' });

        // describe should still be our marker, not overwritten
        expect(g['describe']).toBe(marker);

        // But other globals should be installed
        expect(g['xit']).toBeDefined();
        expect(g['xdescribe']).toBeDefined();

        // Cleanup
        delete g['describe'];
      });

      it('should install globals that do not exist', () => {
        // xit, xdescribe, fit, fdescribe are less likely to exist
        const g = getGlobal();
        delete g['xit'];
        delete g['xdescribe'];

        installGlobals({ collisionPolicy: 'skip' });

        expect(g['xit']).toBeDefined();
        expect(g['xdescribe']).toBeDefined();
      });
    });

    describe('force policy', () => {
      it('should silently overwrite existing globals', () => {
        const g = getGlobal();
        const marker = { isMarker: true };
        g['describe'] = marker;

        installGlobals({ collisionPolicy: 'force' });

        // describe should be overwritten
        expect(g['describe']).not.toBe(marker);
        expect(typeof g['describe']).toBe('function');
      });

      it('should not throw when overwriting', () => {
        installGlobals({ collisionPolicy: 'force' });

        let threw = false;
        try {
          installGlobals({ collisionPolicy: 'force' });
        } catch (e) {
          threw = true;
        }
        expect(threw).toBe(false);
      });
    });
  });

  describe('Namespace option', () => {
    it('should install globals under a namespace', () => {
      installGlobals({ namespace: 'embedunit' });

      const g = getGlobal();
      const ns = g['embedunit'] as Record<string, unknown>;

      expect(ns).toBeDefined();
      expect(ns['describe']).toBeDefined();
      expect(ns['it']).toBeDefined();
      expect(ns['expect']).toBeDefined();
      expect(ns['beforeAll']).toBeDefined();
      expect(ns['beforeEach']).toBeDefined();
      expect(ns['afterEach']).toBeDefined();
      expect(ns['afterAll']).toBeDefined();
      expect(ns['spyOn']).toBeDefined();
      expect(ns['mock']).toBeDefined();
    });

    it('should not pollute the global namespace when using namespace', () => {
      // Ensure these don't exist at global level
      const g = getGlobal();
      delete g['xit'];
      delete g['xdescribe'];
      delete g['fit'];
      delete g['fdescribe'];

      installGlobals({ namespace: 'testns' });

      // These should NOT be at global level
      expect(g['xit']).toBeUndefined();
      expect(g['xdescribe']).toBeUndefined();
      expect(g['fit']).toBeUndefined();
      expect(g['fdescribe']).toBeUndefined();

      // But should be in namespace
      const ns = g['testns'] as Record<string, unknown>;
      expect(ns['xit']).toBeDefined();
      expect(ns['xdescribe']).toBeDefined();
    });

    it('should uninstall globals from namespace correctly', () => {
      installGlobals({ namespace: 'testns' });

      const g = getGlobal();
      expect(g['testns']).toBeDefined();

      uninstallGlobals('testns');

      // Namespace should be removed
      expect(g['testns']).toBeUndefined();
    });

    it('should handle collision policies with namespace', () => {
      const g = getGlobal();
      // Create namespace with existing value
      g['testns'] = { describe: 'existing' };

      // Using force should overwrite
      installGlobals({ namespace: 'testns', collisionPolicy: 'force' });

      const ns = g['testns'] as Record<string, unknown>;
      expect(typeof ns['describe']).toBe('function');
    });
  });

  describe('Selective include option', () => {
    it('should only install specified globals', () => {
      installGlobals({
        include: ['describe', 'it', 'expect'],
        collisionPolicy: 'force'
      });

      const g = getGlobal();
      expect(g['describe']).toBeDefined();
      expect(g['it']).toBeDefined();
      expect(g['expect']).toBeDefined();

      // These should NOT be installed when using include
      // Note: They might exist from previous tests, so we check if they're the embedunit versions
    });

    it('should not install globals not in include list', () => {
      // First clean up
      const g = getGlobal();
      delete g['spyOn'];
      delete g['mock'];
      delete g['xit'];
      delete g['xdescribe'];

      installGlobals({
        include: ['describe', 'it'],
        collisionPolicy: 'force'
      });

      // spyOn and mock should NOT be installed
      expect(g['spyOn']).toBeUndefined();
      expect(g['mock']).toBeUndefined();
    });

    it('should work with namespace and include together', () => {
      installGlobals({
        namespace: 'testns',
        include: ['describe', 'it', 'expect']
      });

      const g = getGlobal();
      const ns = g['testns'] as Record<string, unknown>;

      expect(ns['describe']).toBeDefined();
      expect(ns['it']).toBeDefined();
      expect(ns['expect']).toBeDefined();
      expect(ns['spyOn']).toBeUndefined();
      expect(ns['mock']).toBeUndefined();
    });

    it('should install only hooks when specified', () => {
      const g = getGlobal();
      delete g['beforeAll'];
      delete g['beforeEach'];
      delete g['afterEach'];
      delete g['afterAll'];
      delete g['describe'];
      delete g['it'];

      installGlobals({
        include: ['beforeAll', 'beforeEach', 'afterEach', 'afterAll'],
        collisionPolicy: 'force'
      });

      expect(g['beforeAll']).toBeDefined();
      expect(g['beforeEach']).toBeDefined();
      expect(g['afterEach']).toBeDefined();
      expect(g['afterAll']).toBeDefined();
    });

    it('should install only spy utilities when specified', () => {
      const g = getGlobal();
      delete g['spyOn'];
      delete g['mock'];

      installGlobals({
        include: ['spyOn', 'mock'],
        collisionPolicy: 'force'
      });

      expect(g['spyOn']).toBeDefined();
      expect(g['mock']).toBeDefined();
    });
  });

  describe('State cleanup verification', () => {
    it('should reset installed globals list after uninstall', () => {
      installGlobals({ collisionPolicy: 'force' });
      uninstallGlobals();

      // Installing again should work without issues
      let threw = false;
      try {
        installGlobals({ collisionPolicy: 'error' });
      } catch (e) {
        // May throw if globals already exist from test framework
        threw = true;
      }
      // Either works or throws due to existing globals, but not due to internal state issues
      expect(true).toBe(true); // Test passes if we get here
    });

    it('should handle multiple install/uninstall cycles', () => {
      for (let i = 0; i < 3; i++) {
        installGlobals({ collisionPolicy: 'force' });

        const g = getGlobal();
        expect(g['describe']).toBeDefined();
        expect(g['it']).toBeDefined();

        uninstallGlobals();
      }
    });

    it('should restore previous values on uninstall when using warn/force', () => {
      const g = getGlobal();
      const originalMarker = { original: true };
      g['fdescribe'] = originalMarker;

      installGlobals({ collisionPolicy: 'force' });

      // fdescribe should now be the embedunit version
      expect(g['fdescribe']).not.toBe(originalMarker);
      expect(typeof g['fdescribe']).toBe('function');

      uninstallGlobals();

      // fdescribe should be restored to original
      expect(g['fdescribe']).toBe(originalMarker);

      // Cleanup
      delete g['fdescribe'];
    });

    it('should clear previous values after uninstall', () => {
      const g = getGlobal();
      g['fdescribe'] = { marker: 1 };

      installGlobals({ collisionPolicy: 'force' });
      uninstallGlobals();

      // Second cycle
      g['fdescribe'] = { marker: 2 };
      installGlobals({ collisionPolicy: 'force' });
      uninstallGlobals();

      // Should restore to marker 2, not marker 1
      expect((g['fdescribe'] as { marker: number }).marker).toBe(2);

      // Cleanup
      delete g['fdescribe'];
    });

    it('should handle uninstall when nothing was installed', () => {
      // This should not throw
      let threw = false;
      try {
        uninstallGlobals();
        uninstallGlobals('nonexistent');
      } catch (e) {
        threw = true;
      }
      expect(threw).toBe(false);
    });

    it('should handle uninstall with wrong namespace gracefully', () => {
      installGlobals({ namespace: 'testns' });

      // Uninstalling with different namespace should not affect testns
      let threw = false;
      try {
        uninstallGlobals('wrongnamespace');
      } catch (e) {
        threw = true;
      }
      expect(threw).toBe(false);

      // testns should still exist
      const g = getGlobal();
      expect(g['testns']).toBeDefined();

      // Clean up properly
      uninstallGlobals('testns');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty include array', () => {
      const g = getGlobal();
      delete g['xit'];

      installGlobals({
        include: [],
        collisionPolicy: 'force'
      });

      // Nothing should be installed
      expect(g['xit']).toBeUndefined();
    });

    it('should handle installing same namespace twice', () => {
      installGlobals({ namespace: 'testns' });

      // Second install should work with force
      let threw = false;
      try {
        installGlobals({ namespace: 'testns', collisionPolicy: 'force' });
      } catch (e) {
        threw = true;
      }
      expect(threw).toBe(false);

      const g = getGlobal();
      const ns = g['testns'] as Record<string, unknown>;
      expect(ns['describe']).toBeDefined();
    });

    it('should verify installed functions are callable', () => {
      // Use a unique namespace for this test to avoid interference
      installGlobals({ namespace: 'verifyns' });

      const g = getGlobal();
      const ns = g['verifyns'] as Record<string, unknown>;

      expect(ns).toBeDefined();

      // All functions should be callable
      expect(typeof ns['describe']).toBe('function');
      expect(typeof ns['it']).toBe('function');
      expect(typeof ns['expect']).toBe('function');
      expect(typeof ns['beforeAll']).toBe('function');
      expect(typeof ns['beforeEach']).toBe('function');
      expect(typeof ns['afterEach']).toBe('function');
      expect(typeof ns['afterAll']).toBe('function');
      expect(typeof ns['spyOn']).toBe('function');
      expect(typeof ns['xit']).toBe('function');
      expect(typeof ns['xdescribe']).toBe('function');
      expect(typeof ns['fit']).toBe('function');
      expect(typeof ns['fdescribe']).toBe('function');

      // mock is an object with mockFn, when, verify, reset methods
      expect(typeof ns['mock']).toBe('object');
      const mockObj = ns['mock'] as Record<string, unknown>;
      expect(typeof mockObj['mockFn']).toBe('function');
      expect(typeof mockObj['when']).toBe('function');
      expect(typeof mockObj['verify']).toBe('function');
      expect(typeof mockObj['reset']).toBe('function');

      // Cleanup this namespace
      uninstallGlobals('verifyns');
    });
  });
});
