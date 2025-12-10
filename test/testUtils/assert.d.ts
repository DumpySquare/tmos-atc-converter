/**
 * TypeScript declaration file for test utilities.
 * 
 * @fileoverview Type definitions for custom test assertion utilities
 * @author F5 Networks
 * @since 1.126.0
 */

/**
 * Extended assertion interface for F5 Automation Config Converter tests.
 * Provides additional assertion methods beyond standard Chai assertions.
 */
export interface ExtendedAssert {
    /**
     * Asserts that an object has all of the specified keys.
     * @param object - The object to check
     * @param keys - Array of expected keys
     * @param message - Optional error message
     */
    hasAllKeys(object: any, keys: string[], message?: string): void;

    /**
     * Asserts that an object has a specific property.
     * @param object - The object to check
     * @param property - The property name to check for
     * @param message - Optional error message
     */
    property(object: any, property: string, message?: string): void;

    /**
     * Asserts that a value is a number.
     * @param value - The value to check
     * @param message - Optional error message
     */
    isNumber(value: any, message?: string): void;

    /**
     * Asserts that a number is at least a specified value.
     * @param actual - The actual number
     * @param expected - The minimum expected value
     * @param message - Optional error message
     */
    isAtLeast(actual: number, expected: number, message?: string): void;

    /**
     * Asserts deep strict equality between two values.
     * @param actual - The actual value
     * @param expected - The expected value
     * @param message - Optional error message
     */
    deepStrictEqual(actual: any, expected: any, message?: string): void;

    /**
     * Asserts that a value is an array.
     * @param value - The value to check
     * @param message - Optional error message
     */
    isArray(value: any, message?: string): void;

    /**
     * Asserts that a value is a string.
     * @param value - The value to check
     * @param message - Optional error message
     */
    isString(value: any, message?: string): void;

    /**
     * Asserts that a string is not empty.
     * @param value - The string to check
     * @param message - Optional error message
     */
    isNotEmpty(value: string, message?: string): void;

    /**
     * Asserts that a string matches a regular expression.
     * @param value - The string to test
     * @param pattern - The regular expression pattern
     * @param message - Optional error message
     */
    match(value: string, pattern: RegExp, message?: string): void;

    /**
     * Asserts that a number is below a specified value.
     * @param actual - The actual number
     * @param expected - The maximum expected value
     * @param message - Optional error message
     */
    isBelow(actual: number, expected: number, message?: string): void;

    /**
     * Asserts that an array has a specific length.
     * @param array - The array to check
     * @param length - The expected length
     * @param message - Optional error message
     */
    lengthOf(array: any[], length: number, message?: string): void;

    /**
     * Asserts strict equality between two values.
     * @param actual - The actual value
     * @param expected - The expected value
     * @param message - Optional error message
     */
    strictEqual(actual: any, expected: any, message?: string): void;

    /**
     * Asserts that a promise is rejected.
     * @param promise - The promise to test
     * @param message - Optional error message
     * @returns Promise that resolves when assertion completes
     */
    isRejected(promise: Promise<any>, message?: string): Promise<void>;
}

/**
 * Custom assert module for F5 Automation Config Converter tests.
 */
declare const assert: ExtendedAssert;

export default assert;