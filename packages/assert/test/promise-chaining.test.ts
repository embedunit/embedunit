// Assuming this test file is located appropriately relative to your src directory
// e.g., in a 'test/' folder at the same level as 'src/'
import { describe, it } from '@embedunit/core';
import { expect } from '../src';

describe('Promise assertion chaining', () => {
    // Helper functions to create test promises
    const resolveWith = <T>(value: T, delay = 0): Promise<T> =>
        new Promise(resolve => setTimeout(() => resolve(value), delay));

    const rejectWith = <T>(reason: T, delay = 0): Promise<never> =>
        new Promise((_, reject) => setTimeout(() => reject(reason), delay));

    describe('assertion methods after resolves/rejects', () => {
        it('should support assertion methods directly after resolves/rejects', async () => {
            // Use assertion methods directly
            await expect(resolveWith('test')).resolves.toBe('test');
            await expect(resolveWith(42)).resolves.toBe(42);
            await expect(resolveWith(['test'])).resolves.toHaveLength(1);
            await expect(resolveWith({ prop: 'value' })).resolves.toHaveProperty('prop', 'value');

            // Multiple assertions on the same promise
            const promise = resolveWith({ name: 'test', items: [1, 2, 3] });
            await expect(promise).resolves.toHaveProperty('name', 'test');
            // Correct way to check property and its length separately
            await expect(promise).resolves.toHaveProperty('items');
            const resolved = await promise; // Get the value to assert on its property
            expect(resolved.items).toHaveLength(3); // Standard sync assertion on the property

            // Or check property length on the original resolved object if the matcher supports it
            // Assuming toHaveProperty doesn't change the subject of the assertion:
            await expect(promise).resolves.toHaveProperty('items')
            const resolvedValue = await promise;
            expect(resolvedValue.items).toHaveLength(3);

            await expect(resolveWith(5)).resolves.toBe(5);
            await expect(resolveWith(6)).resolves.toBeGreaterThan(5);

        });

        it('should support assertion methods directly after rejects', async () => {
            const error = new Error('Invalid operation');
            error.name = 'ValidationError';
            (error as any).code = 42;

            await expect(rejectWith(error)).rejects.toBeInstanceOf(Error);
            await expect(rejectWith(error)).rejects.toHaveProperty('name', 'ValidationError');
            await expect(rejectWith(error)).rejects.toHaveProperty('code', 42);
            await expect(rejectWith(error)).rejects.toMatch('Invalid operation'); // Check message
            // Combining property check and match on the error object itself
            await expect(rejectWith(error)).rejects.toMatch(/Invalid/);
        });
    });

    describe('not assertion chaining', () => {
        it('should support not for resolves assertions', async () => {
            await expect(resolveWith('test')).resolves.not.toBe('wrong');
            await expect(resolveWith(42)).resolves.not.toBeLessThan(10);
            await expect(resolveWith([1, 2, 3])).resolves.not.toHaveLength(5);
            await expect(resolveWith('hello world')).resolves.not.toMatch(/^goodbye/);
        });

        it('should support not for rejects assertions', async () => {
            await expect(rejectWith(new Error('database error'))).rejects.not.toMatch('network error');
            await expect(rejectWith(new TypeError('type error'))).rejects.not.toBeInstanceOf(RangeError);
            await expect(rejectWith({ code: 404 })).rejects.not.toEqual({ code: 500 });
            await expect(rejectWith('a string error')).rejects.not.toBeInstanceOf(Error);
        });

        it('should support double negation', async () => {
            await expect(resolveWith('test')).resolves.not.not.toBe('test');
            await expect(rejectWith(new Error('error'))).rejects.not.not.toBeInstanceOf(Error);
        });
    });

    describe('real-world usage examples', () => {
        class User {
            constructor(public id: number, public name: string) {}
        }

        class UserService {
            // Mock service methods (same as original)
            async findById(id: number): Promise<User | null> {
                if (id === 1) return new User(1, 'Admin');
                if (id === 2) return new User(2, 'Guest');
                await new Promise(res => setTimeout(res, 5)); // simulate async
                return null;
            }

            async createUser(userData: { name: string }): Promise<User> {
                await new Promise(res => setTimeout(res, 5)); // simulate async
                if (!userData.name) {
                    throw new Error('User name is required');
                }
                return new User(999, userData.name);
            }

            async deleteUser(id: number): Promise<boolean> {
                await new Promise(res => setTimeout(res, 5)); // simulate async
                if (id === 1) {
                    throw new Error('Cannot delete admin user');
                }
                return true;
            }
        }

        const userService = new UserService();

        it('should test a find by ID operation', async () => {
            // Test successful case
            await expect(userService.findById(1)).resolves.toBeInstanceOf(User);
            await expect(userService.findById(1)).resolves.toHaveProperty('name', 'Admin');

            // Test not found case
            await expect(userService.findById(9999)).resolves.toBeNull();
        });

        it('should test user creation', async () => {
            // Test successful case
            const newUser = { name: 'New User' };
            await expect(userService.createUser(newUser)).resolves.toBeInstanceOf(User);
            await expect(userService.createUser(newUser)).resolves.toHaveProperty('name', 'New User');

            // Test validation error
            const invalidUser = { name: '' };
            await expect(userService.createUser(invalidUser)).rejects.toBeInstanceOf(Error);
            await expect(userService.createUser(invalidUser)).rejects.toMatch('User name is required');
        });

        it('should test user deletion', async () => {
            // Test successful case
            await expect(userService.deleteUser(2)).resolves.toBeTruthy();

            // Test failure case
            await expect(userService.deleteUser(1)).rejects.toBeInstanceOf(Error);
            await expect(userService.deleteUser(1)).rejects.toMatch('Cannot delete admin user');
        });
    });
});
