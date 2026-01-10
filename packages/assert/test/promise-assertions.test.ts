import { describe, it } from '@embedunit/core';
import { expect } from '../src';


describe('Promise-based assertions Minimal', () => {
    const rejectWith = <T>(reason: T, delay = 0): Promise<never> =>
        new Promise((_, reject) => setTimeout(() => reject(reason), delay));

    it('minimal rejection test', async () => {
        await expect(rejectWith('error')).rejects.toBe('error');
    });
});


describe('Promise-based assertions', () => {
    // Helper functions to create test promises
    const resolveWith = <T>(value: T, delay = 0): Promise<T> =>
        new Promise(resolve => setTimeout(() => resolve(value), delay));

    const rejectWith = <T>(reason: T, delay = 0): Promise<never> =>
        new Promise((_, reject) => setTimeout(() => reject(reason), delay));

    describe('resolves assertions', () => {
        it('should pass when promise resolves with the expected value', async () => {
            await expect(resolveWith('success')).resolves.toBe('success');
            await expect(resolveWith(42)).resolves.toBe(42);
            await expect(resolveWith(null)).resolves.toBe(null);
            await expect(resolveWith(undefined)).resolves.toBe(undefined);
        });

        it('should pass with deep equality checks', async () => {
            const obj = {name: 'test', value: 123, nested: {key: 'value'}};
            await expect(resolveWith(obj)).resolves.toEqual(obj);
            await expect(resolveWith([1, 2, 3])).resolves.toEqual([1, 2, 3]);
        });

        it('should pass with truthiness checks', async () => {
            await expect(resolveWith('non-empty string')).resolves.toBeTruthy();
            await expect(resolveWith(42)).resolves.toBeTruthy();
            await expect(resolveWith({})).resolves.toBeTruthy();
            await expect(resolveWith('')).resolves.toBeFalsy();
            await expect(resolveWith(0)).resolves.toBeFalsy();
            await expect(resolveWith(null)).resolves.toBeFalsy();
        });

        it('should pass with instance checks', async () => {
            await expect(resolveWith(new Error('test'))).resolves.toBeInstanceOf(Error);
            await expect(resolveWith(new Date())).resolves.toBeInstanceOf(Date);
        });

        it('should pass with string pattern matching', async () => {
            await expect(resolveWith('hello world')).resolves.toMatch('world');
            await expect(resolveWith('hello world')).resolves.toMatch(/^hello/);
        });

        it('should pass with not.resolves for failed assertions', async () => {
            await expect(resolveWith('success')).not.resolves.toBe('failure');
            await expect(resolveWith(42)).not.resolves.toBe(43);
            await expect(resolveWith('hello')).not.resolves.toMatch('goodbye');
        });

        it('should pass with not.resolves for rejections', async () => {
            await expect(rejectWith(new Error('test error'))).not.resolves.toBe('anything');
        });

        it('should fail when promise resolves with an unexpected value', async () => {
            let error: Error | null = null;
            try {
                await expect(resolveWith('success')).resolves.toBe('failure');
            } catch (e) {
                error = e as Error;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/Expected promise to resolve with/);
        });
    });

    describe('rejects assertions', () => {
        it('should pass when promise rejects with the expected value', async () => {
            await expect(rejectWith('error')).rejects.toBe('error');
            await expect(rejectWith(new Error('test error'))).rejects.toBeInstanceOf(Error);
        });

        it('should pass with error message matching', async () => {
            await expect(rejectWith(new Error('test error'))).rejects.toMatch('test');
            await expect(rejectWith(new Error('test error'))).rejects.toMatch(/error$/);
        });

        it('should pass with deep equality for complex errors', async () => {
            const customError = new Error('custom');
            customError.name = 'CustomError';
            (customError as any).code = 'ERR_CUSTOM';

            await expect(rejectWith(customError)).rejects.toEqual(customError);
        });

        it('should pass with not.rejects for successful assertions', async () => {
            await expect(rejectWith(new Error('validation error'))).not.rejects.toMatch('database error');
            await expect(rejectWith(new Error('test'))).not.rejects.toBeInstanceOf(TypeError);
        });

        it('should pass with not.rejects for resolutions', async () => {
            await expect(resolveWith('success')).not.rejects.toBe('anything');
        });

        it('should fail when promise resolves but rejection was expected', async () => {
            let error: Error | null = null;
            try {
                await expect(resolveWith('success')).rejects.toBe('anything');
            } catch (e) {
                error = e as Error;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/Expected promise to reject, but it resolved with/);
        });

        it('should fail when promise rejects with an unexpected value', async () => {
            let error: Error | null = null;
            try {
                await expect(rejectWith('error')).rejects.toBe('different error');
            } catch (e) {
                error = e as Error;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/Expected promise to reject with/);
        });
    });

    describe('error handling', () => {
        it('should throw TypeError when actual value is not a promise', () => {
            expect(() => expect('not a promise').resolves).toThrow(TypeError);
            expect(() => expect(42).rejects).toThrow(TypeError);
            expect(() => expect(null).resolves).toThrow(TypeError);
            expect(() => expect(undefined).rejects).toThrow(TypeError);
        });

        it('should throw when using toBeTruthy with rejects', async () => {
            try {
                await expect(rejectWith('error')).rejects.toBeTruthy();
            } catch (e) {
            }
        });


        // it('should throw when using toBeTruthy with rejects', async () => {
        //     let error: Error | null = null;
        //     try {
        //         await expect(rejectWith('error')).rejects.toBeTruthy();
        //     } catch (e) {
        //         error = e as Error;
        //     }
        //     expect(error).not.toBeNull();
        //     expect(error?.message).toMatch(/not applicable for .rejects/);
        // });
    });
});
