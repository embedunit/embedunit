// packages/core/test/skip-basic.test.ts
// Simple test to verify skip functionality without .only interference
import { describe, it, xit, xdescribe } from '../src';
import { expect } from '@embedunit/assert';

describe('Skip Functionality Test', () => {
    it('should run this normal test', () => {
        expect(true).toBe(true);
    });

    it.skip('should skip this test', () => {
        throw new Error('This should not run!');
    });

    xit('should skip via xit', () => {
        throw new Error('This should not run!');
    });

    describe.skip('Skipped Suite', () => {
        it('test 1 in skipped suite', () => {
            throw new Error('This should not run!');
        });

        it('test 2 in skipped suite', () => {
            throw new Error('This should not run!');
        });
    });

    xdescribe('xdescribe Suite', () => {
        it('test in xdescribe', () => {
            throw new Error('This should not run!');
        });
    });

    it('should run this test after skipped ones', () => {
        expect(2 + 2).toBe(4);
    });
});
