// Minimal reproduction for returnValues bug
// After exhausting values, subsequent calls should return undefined
// but they continue returning the last value instead

import { describe, it } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import { spyOn } from '../src/index';

describe('returnValues bug reproduction', () => {
    it('should return undefined after exhausting returnValues', () => {
        const service = {
            getNextId: () => 1
        };

        const spy = spyOn(service, 'getNextId');
        spy.returnValues(10, 20, 30);

        // First 3 calls work correctly
        const first = service.getNextId();
        console.log('Call 1:', first); // Expected: 10, Actual: 10 ✓
        expect(first).toBe(10);

        const second = service.getNextId();
        console.log('Call 2:', second); // Expected: 20, Actual: 20 ✓
        expect(second).toBe(20);

        const third = service.getNextId();
        console.log('Call 3:', third); // Expected: 30, Actual: 30 ✓
        expect(third).toBe(30);

        // 4th call should return undefined
        const fourth = service.getNextId();
        console.log('Call 4:', fourth); // Expected: undefined, Actual: 30 ✗
        expect(fourth).toBeUndefined(); // FAILS: returns 30 instead

        // 5th call should also return undefined
        const fifth = service.getNextId();
        console.log('Call 5:', fifth); // Expected: undefined, Actual: 30 ✗
        expect(fifth).toBeUndefined(); // FAILS: returns 30 instead
    });
});
